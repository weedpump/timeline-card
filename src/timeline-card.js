import cs from './locales/cs.json';
import de from './locales/de.json';
import enGB from './locales/en-GB.json';
import enUS from './locales/en-US.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import ptBR from './locales/pt-BR.json';
import ru from './locales/ru.json';
import sv from './locales/sv.json';
import styles from './timeline-card.css';
import packageMetadata from '../package.json';

import './editor/timeline-card-editor.js';

import { TranslationEngine } from './translation-engine.js';
import { relativeTime, formatAbsoluteTime } from './time-engine.js';

import { fetchHistory } from './history-fetch.js';
import { transformHistory } from './history-transform.js';
import { filterHistory, passesValueFilter } from './history-filter.js';

import { getCachedHistory, setCachedHistory } from './history-cache.js';

// Unified state transformer for both history + live
import { transformState } from './state-transform.js';
import { resolveStateMappedColor } from './color-engine.js';
import {
  createEntitySuggestion,
  createPreviewConfig,
  getEffectiveTimelineLayout,
  isCardPickerPreview,
} from './card-picker.js';
import { createLiveSubscription } from './live-subscription.js';
import { createCurrentStatePreview } from './preview-items.js';
import { measureUntransformedWidth } from './single-side-width.js';

const translations = {
  cs,
  de,
  'en-gb': enGB,
  'en-us': enUS,
  fr,
  it,
  nl,
  pl,
  'pt-br': ptBR,
  ru,
  sv,
};

console.info(
  `%c TIMELINE-CARD %c v${packageMetadata.version} `,
  'background:#2da8ff;color:#fff;padding:4px 7px;font-weight:700;border-radius:4px 0 0 4px',
  'background:#b24aff;color:#fff;padding:4px 7px;font-weight:700;border-radius:0 4px 4px 0'
);

class TimelineCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('weedpump-timeline-card-editor');
  }

  static getStubConfig(hass, entities, entitiesFallback) {
    return createPreviewConfig(hass, entities, entitiesFallback);
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Please define 'entities' as a list.");
    }

    this.entities = config.entities.map((e) =>
      typeof e === 'string'
        ? { entity: e }
        : {
            ...e,
            name_color: e.name_color || null,
            state_color: e.state_color || null,
          }
    );

    // Prevent conflicting filters on entity level
    for (const ent of this.entities) {
      const include = Array.isArray(ent.include_states)
        ? ent.include_states
        : [];
      const exclude = Array.isArray(ent.exclude_states)
        ? ent.exclude_states
        : [];

      if (include.length > 0 && exclude.length > 0) {
        throw new Error(
          `timeline-card: Entity "${ent.entity}" cannot use include_states and exclude_states simultaneously.`
        );
      }
    }

    this.limit = config.limit;
    this.hours = config.hours;
    this.title = typeof config.title === 'string' ? config.title : '';

    this.relativeTimeEnabled = config.relative_time ?? false;
    this.showDate = config.show_date ?? true;
    this.showStates = config.show_states ?? true;
    this.showNames = config.show_names ?? true;
    this.showIcons = config.show_icons ?? true;

    this.allowMultiline = config.allow_multiline ?? false;
    this.forceMultiline = config.force_multiline ?? false;
    this.compactLayout = config.compact_layout ?? false;
    const layout = (config.card_layout || 'center').toLowerCase();
    this.cardLayout = ['center', 'left', 'right'].includes(layout)
      ? layout
      : 'center';

    this.cardBackground = config.card_background ?? null;
    this.timelineLineStart = config.timeline_color_start ?? null;
    this.timelineLineEnd = config.timeline_color_end ?? null;
    this.dotColor = config.dot_color ?? null;

    if (this.compactLayout && this.cardLayout !== 'center') {
      throw new Error(
        'timeline-card: compact_layout is only supported with card_layout: center.'
      );
    }

    // NEW: global colors
    this.nameColor = config.name_color || null;
    this.stateColor = config.state_color || null;

    // Overflow handling
    const visibleRaw = config.visible_events;
    const visibleParsed =
      typeof visibleRaw === 'string' ? parseInt(visibleRaw, 10) : visibleRaw;
    this.visibleEventCount =
      Number.isInteger(visibleParsed) && visibleParsed > 0
        ? visibleParsed
        : null;
    const overflow = (config.overflow || 'collapse').toLowerCase();
    this.overflowMode = overflow === 'scroll' ? 'scroll' : 'collapse';
    this.maxHeight = config.max_height || null;
    this.expanded = false;

    this.refreshInterval = config.refresh_interval || null;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
    this.singleSideResizeObserver?.disconnect();
    this.singleSideResizeObserver = null;
    this.singleSideWidth = null;
    this.singleSideLayout = null;
    this.singleSideSignature = null;

    this.liveSubscription?.stop();
    this.liveSubscription = null;
    this.configGeneration = (this.configGeneration || 0) + 1;
    this.dataGeneration = (this.dataGeneration || 0) + 1;
    this.i18nReady = false;

    this.items = [];
    this.loaded = false;
    this.config = config;

    this._applyThemeVars();
  }

  connectedCallback() {
    // Ensure structure exists immediately so card_mod can attach
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    this.ensureCardExists();

    if (this.loaded && this.items?.length && this.cardLayout !== 'center') {
      this.applySingleSideWidth(this.shadowRoot, this.cardLayout);
    }

    const wasPreview = this.isPreviewMode();
    this.pickerPreview = isCardPickerPreview(this);
    const modeChanged = this.handlePreviewModeChange(wasPreview);

    if (!modeChanged && this.loaded && this.i18nReady) {
      this.applyCurrentMode();
    }
    queueMicrotask(() => this.startLiveEventsIfNeeded());
  }

  set preview(value) {
    const wasPreview = this.isPreviewMode();
    this._preview = value === true;
    this.handlePreviewModeChange(wasPreview);
  }

  get preview() {
    return this._preview === true;
  }

  isPreviewMode() {
    return this.pickerPreview === true;
  }

  handlePreviewModeChange(wasPreview) {
    const isPreview = this.isPreviewMode();
    if (wasPreview === isPreview) return false;

    this.dataGeneration = (this.dataGeneration || 0) + 1;
    this.liveSubscription?.stop();
    this.liveSubscription = null;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.loaded || !this.i18nReady) return true;

    if (isPreview) {
      this.loadPreview();
    } else {
      this.items = [];
      this.render();
      this.startNormalMode();
    }

    return true;
  }

  ensureCardExists() {
    const root = this.shadowRoot;
    if (!root.querySelector('style')) {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      root.appendChild(styleEl);
    }
    if (!root.querySelector('ha-card')) {
      const card = document.createElement('ha-card');
      root.appendChild(card);
    }
  }

  _applyThemeVars() {
    this._setStyleVar('--tc-line-start', this.timelineLineStart);
    this._setStyleVar('--tc-line-end', this.timelineLineEnd);
    this._setStyleVar('--tc-dot-color', this.dotColor);
  }

  _setStyleVar(name, value) {
    if (value) {
      this.style.setProperty(name, value);
    } else {
      this.style.removeProperty(name);
    }
  }

  set hass(hass) {
    this.hassInst = hass;

    if (!this.loaded) {
      this.loaded = true;

      const yamlLang = this.config.language;
      const haLang = hass?.locale?.language;
      const browserLang = navigator.language;
      const configGeneration = this.configGeneration;

      this.language = yamlLang || haLang || browserLang || 'en-US';
      this.i18n = new TranslationEngine(translations);

      this.i18n.load(this.language).then(() => {
        if (configGeneration !== this.configGeneration) return;

        // Keep the full normalized language code so region-specific formats work.
        this.languageCode = this.i18n.langCode || this.language.toLowerCase();
        this.i18nReady = true;
        if (this.isConnected) this.applyCurrentMode();
      });
    } else if (this.isPreviewMode() && this.i18nReady) {
      queueMicrotask(() => {
        if (
          this.isConnected &&
          this.isPreviewMode() &&
          this.hassInst === hass
        ) {
          this.loadPreview();
        }
      });
    }

    queueMicrotask(() => {
      if (this.hassInst === hass) this.startLiveEventsIfNeeded();
    });
  }

  applyCurrentMode() {
    if (this.isPreviewMode()) {
      this.loadPreview();
    } else {
      this.startNormalMode();
    }
  }

  startNormalMode() {
    if (
      this.isPreviewMode() ||
      !this.isConnected ||
      !this.i18nReady ||
      !this.hassInst
    ) {
      return;
    }

    const generation = this.dataGeneration;
    this.loadHistory(generation).catch(() => undefined);

    if (this.refreshInterval && !this.refreshTimer) {
      this.startAutoRefresh();
    }

    queueMicrotask(() => this.startLiveEventsIfNeeded());
  }

  loadPreview() {
    this.items = createCurrentStatePreview(
      this.hassInst,
      this.entities,
      this.i18n,
      this.limit,
      this.config
    );
    this.render();
  }

  async loadHistory(generation = this.dataGeneration) {
    if (this.isPreviewMode() || generation !== this.dataGeneration) return;

    const cached = getCachedHistory(
      this.entities,
      this.hours,
      this.languageCode
    );

    if (cached) {
      if (this.isPreviewMode() || generation !== this.dataGeneration) return;
      this.items = cached;
      this.render();
      this.refreshInBackground(generation).catch(() => undefined);
      return;
    }

    await this.refreshInForeground(generation);
  }

  async refreshInForeground(generation = this.dataGeneration) {
    const raw = await fetchHistory(this.hassInst, this.entities, this.hours);
    if (this.isPreviewMode() || generation !== this.dataGeneration) return;

    const flat = transformHistory(
      raw,
      this.entities,
      this.hassInst.states,
      this.i18n
    );

    const items = filterHistory(
      flat,
      this.entities,
      this.limit,
      this.config // includes collapse_duplicates
    );

    if (this.isPreviewMode() || generation !== this.dataGeneration) return;
    setCachedHistory(this.entities, this.hours, this.languageCode, items);

    this.items = items;
    this.render();
  }

  async refreshInBackground(generation = this.dataGeneration) {
    const raw = await fetchHistory(this.hassInst, this.entities, this.hours);
    if (this.isPreviewMode() || generation !== this.dataGeneration) return;

    const flat = transformHistory(
      raw,
      this.entities,
      this.hassInst.states,
      this.i18n
    );

    const items = filterHistory(
      flat,
      this.entities,
      this.limit,
      this.config // includes collapse_duplicates
    );

    if (this.isPreviewMode() || generation !== this.dataGeneration) return;
    if (JSON.stringify(items) === JSON.stringify(this.items)) return;

    setCachedHistory(this.entities, this.hours, this.languageCode, items);

    this.items = items;
    this.render();
  }

  startAutoRefresh() {
    if (this.isPreviewMode()) return;
    if (this.refreshTimer) clearInterval(this.refreshTimer);

    this.refreshTimer = setInterval(() => {
      const generation = this.dataGeneration;
      this.refreshInBackground(generation).catch(() => undefined);
    }, this.refreshInterval * 1000);
  }

  startLiveEventsIfNeeded() {
    if (
      this.isPreviewMode() ||
      !this.isConnected ||
      !this.hassInst?.connection ||
      this.liveSubscription
    ) {
      return;
    }

    const entityIds = this.entities.map((e) => e.entity);
    const generation = this.dataGeneration;
    const subscription = createLiveSubscription(
      this.hassInst.connection,
      (msg) => {
        if (
          this.isPreviewMode() ||
          generation !== this.dataGeneration ||
          this.liveSubscription !== subscription
        ) {
          return;
        }

        const data = msg?.data;
        if (!data?.entity_id) return;
        if (!entityIds.includes(data.entity_id)) return;

        this.processLiveEvent(data);
      }
    );

    this.liveSubscription = subscription;
    subscription.ready.catch(() => {
      if (this.liveSubscription === subscription) {
        this.liveSubscription = null;
      }
    });
  }

  processLiveEvent(data) {
    const entityId = data.entity_id;
    const newState = data.new_state;

    const cfg = this.entities.find((e) => e.entity === entityId);

    // --- include/exclude filter for LIVE EVENTS ---
    const include = Array.isArray(cfg?.include_states)
      ? cfg.include_states
      : null;
    const exclude = Array.isArray(cfg?.exclude_states)
      ? cfg.exclude_states
      : null;

    if (include && !include.includes(newState.state)) {
      return; // ignore this live event (not in include list)
    }
    if (exclude && exclude.includes(newState.state)) {
      return; // ignore this live event (blocked by exclude list)
    }
    if (!passesValueFilter(newState.state, cfg)) {
      return; // ignore this live event (outside min_value/max_value range)
    }
    // ---------------------------------------------

    const item = transformState(
      entityId,
      newState,
      this.hassInst,
      this.entities,
      this.i18n
    );

    if (!item) return;

    // --- NEW: collapse duplicates for LIVE events ---
    const collapse =
      cfg?.collapse_duplicates ?? this.config.collapse_duplicates ?? false;

    if (collapse) {
      const last = this.items.find((i) => i.id === item.id);
      if (last && last.raw_state === item.raw_state) {
        return; // ignore duplicate
      }
    }
    // -------------------------------------------------

    // Insert new event at the top
    this.items.unshift(item);

    // Limit size
    if (this.limit && this.items.length > this.limit) {
      this.items = this.items.slice(0, this.limit);
    }

    this.render();
  }

  disconnectedCallback() {
    this.dataGeneration = (this.dataGeneration || 0) + 1;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.liveSubscription?.stop();
    this.liveSubscription = null;
    this.singleSideResizeObserver?.disconnect();
    this.singleSideResizeObserver = null;
  }

  // ------------------------------------
  // Helper: Capitalize state string
  // ------------------------------------
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ------------------------------------
  // RENDER CARD
  // ------------------------------------
  render() {
    // Check if we already have a shadow root
    let root = this.shadowRoot;

    // If not, create it
    if (!root) {
      root = this.attachShadow({ mode: 'open' });
    }

    // Ensure card exists
    this.ensureCardExists();
    let card = root.querySelector('ha-card');

    if (this.cardBackground) {
      card.style.background = this.cardBackground;
    } else {
      card.style.removeProperty('background');
    }

    if (!this.items.length) {
      this.singleSideResizeObserver?.disconnect();
      this.singleSideResizeObserver = null;
      card.innerHTML = `
          <div style="padding:12px">${this.i18n.t('ui.no_events')}</div>
      `;
      return;
    }

    const overflowMode = this.overflowMode === 'scroll' ? 'scroll' : 'collapse';
    const hasVisibleLimit =
      overflowMode === 'collapse' &&
      Number.isInteger(this.visibleEventCount) &&
      this.visibleEventCount > 0;
    const visibleLimit = hasVisibleLimit ? this.visibleEventCount : null;

    const shouldCollapse =
      overflowMode === 'collapse' &&
      visibleLimit !== null &&
      !this.expanded &&
      this.items.length > visibleLimit;

    const hiddenCount =
      overflowMode === 'collapse' && visibleLimit
        ? Math.max(this.items.length - visibleLimit, 0)
        : 0;

    const eventBoxClassName = [
      'event-box',
      this.allowMultiline ? 'auto-multiline' : '',
      this.forceMultiline ? 'force-multiline' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const renderedItems = shouldCollapse
      ? this.items.slice(0, visibleLimit)
      : this.items;

    const previewMode = this.isPreviewMode();
    const layout = getEffectiveTimelineLayout(this.cardLayout, previewMode);
    const previewClass = previewMode ? 'picker-preview' : '';
    const compactClass =
      this.compactLayout && layout === 'center' ? 'compact' : '';

    const rows = renderedItems
      .map((item, index) => {
        const side =
          layout === 'center'
            ? index % 2 === 0
              ? 'left'
              : 'right'
            : layout === 'left'
              ? 'right'
              : 'left';

        const entityCfg = item.entityCfg || {};
        const entityPicture = item.entity_picture;
        const showEntityPicture =
          this.showIcons && entityCfg.show_entity_picture && entityPicture;

        // COLOR RESOLUTION: entity state map → entity → card → theme/css
        const nameColor = resolveStateMappedColor(
          item.raw_state,
          entityCfg.name_color_map,
          entityCfg.name_color,
          this.nameColor
        );
        const stateColor = entityCfg.state_color || this.stateColor || '';

        const renderEventBox = () => `
          <div class="${eventBoxClassName}" data-entity-id="${item.id}">
            ${
              this.showIcons
                ? showEntityPicture
                  ? `<img class="entity-picture" src="${entityPicture}" alt="">`
                  : `<ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>`
                : ``
            }
            <div class="text">
              <div class="row">
                ${
                  this.showNames
                    ? `<div class="primary-text name" style="${
                        nameColor ? `color:${nameColor};` : ''
                      }">${item.name}</div>`
                    : ``
                }
                ${
                  this.showStates
                    ? this.showNames
                      ? `<div class="secondary-text state" style="${
                          stateColor ? `color:${stateColor};` : ''
                        }">(${item.state})</div>`
                      : `<div class="primary-text state" style="${
                          stateColor ? `color:${stateColor};` : ''
                        }">${this.capitalize(item.state)}</div>`
                    : ``
                }
              </div>
              <div class="time">
                ${
                  this.relativeTimeEnabled
                    ? relativeTime(item.time, this.i18n)
                    : formatAbsoluteTime(
                        item.time,
                        this.languageCode,
                        this.i18n,
                        { includeDate: this.showDate }
                      )
                }
              </div>
            </div>
          </div>
        `;

        return `
          <div class="timeline-row">
            <div class="side left">
              ${side === 'left' ? renderEventBox() : ''}
            </div>

            <div class="dot"></div>

            <div class="side right">
              ${side === 'right' ? renderEventBox() : ''}
            </div>
          </div>
        `;
      })
      .join('');

    const containerStyles = [];
    if (this.maxHeight) {
      const value =
        typeof this.maxHeight === 'number'
          ? `${this.maxHeight}px`
          : `${this.maxHeight}`;
      containerStyles.push(`max-height:${value};`);
    }
    if (overflowMode === 'scroll' || containerStyles.length) {
      containerStyles.push('overflow-y:auto;');
    }
    const containerStyle = containerStyles.join('');

    const collapseToggle =
      overflowMode === 'collapse' && hiddenCount > 0
        ? `
          <div class="toggle-row">
            <button class="toggle-button" type="button" id="tc-toggle-hidden" aria-expanded="${this.expanded}">
              ${
                this.expanded
                  ? this.i18n.t('ui.show_less')
                  : this.i18n.t('ui.show_more', { n: hiddenCount })
              }
            </button>
          </div>
        `
        : '';

    card.innerHTML = `
        ${this.title ? `<h1 class="card-title">${this.title}</h1>` : ''}
        <div class="timeline-container ${
          overflowMode === 'scroll' ? 'scrollable' : ''
        }" style="${containerStyle}">
          <div class="wrapper ${compactClass} ${previewClass} layout-${layout}">
            <div class="timeline-line"></div>
            ${rows}
          </div>
        </div>
        ${collapseToggle}
    `;

    const toggleBtn = root.getElementById('tc-toggle-hidden');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.expanded = !this.expanded;
        this.render();
      });
    }

    root.querySelectorAll('.event-box[data-entity-id]').forEach((el) => {
      el.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('hass-more-info', {
            detail: { entityId: el.dataset.entityId },
            bubbles: true,
            composed: true,
          })
        );
      });
    });

    // Ensure single-sided layouts share the same card width (widest card)
    this.applySingleSideWidth(root, layout);
  }

  getCardSize() {
    return this.visibleEventCount || this.limit || 3;
  }

  applySingleSideWidth(root, layout) {
    this.singleSideResizeObserver?.disconnect();
    this.singleSideResizeObserver = null;

    if (this.isPreviewMode()) {
      this.singleSideWidth = null;
      this.singleSideLayout = null;
      this.singleSideSignature = null;
      root
        .querySelector('.wrapper')
        ?.style.removeProperty('--tc-event-col-width');
      return;
    }

    if (layout === 'center') {
      this.singleSideWidth = null;
      this.singleSideLayout = null;
      this.singleSideSignature = null;
      return;
    }

    const container = root.querySelector('.timeline-container');
    const wrapper = root.querySelector('.wrapper');
    if (!container || !wrapper) return;

    const boxes = Array.from(wrapper.querySelectorAll('.event-box'));
    if (!boxes.length) return;

    const signature = `${layout}-${this.allowMultiline}-${this.forceMultiline}`;
    if (this.singleSideSignature !== signature) {
      this.singleSideWidth = null;
      this.singleSideLayout = layout;
      this.singleSideSignature = signature;
    }

    const lineColRaw =
      getComputedStyle(wrapper).getPropertyValue('--tc-line-column');
    const lineCol = parseFloat(lineColRaw) || 0;
    const gap = 16; // column-gap defined in CSS
    let naturalWidth = 0;

    const applyAvailableWidth = () => {
      if (!container.isConnected) return;

      const maxAvailable = Math.max(container.clientWidth - lineCol - gap, 0);

      if (naturalWidth > 0 && maxAvailable > 0) {
        const target = Math.min(naturalWidth, maxAvailable);

        this.singleSideWidth = target;
        this.singleSideLayout = layout;
        wrapper.style.setProperty('--tc-event-col-width', `${target}px`);
      } else {
        this.singleSideWidth = null;
        wrapper.style.removeProperty('--tc-event-col-width');
      }
    };

    const measureNaturalWidth = () => {
      if (!container.isConnected) return;

      wrapper.style.removeProperty('--tc-event-col-width');
      if (container.clientWidth === 0) {
        naturalWidth = 0;
        return;
      }

      if (!this.forceMultiline) {
        const previousMaxWidth = wrapper.style.maxWidth;
        wrapper.style.maxWidth = 'none';
        naturalWidth = Math.max(
          Math.ceil(measureUntransformedWidth(wrapper) - lineCol - gap + 8),
          0
        );
        wrapper.style.maxWidth = previousMaxWidth;
      } else {
        // Batch writes and reads to avoid one forced layout per event box.
        const previousStyles = boxes.map((box) => ({
          width: box.style.width,
          maxWidth: box.style.maxWidth,
        }));

        boxes.forEach((box) => {
          box.style.width = 'min-content';
          box.style.maxWidth = 'none';
        });

        naturalWidth = boxes.reduce(
          (max, box) => Math.max(max, Math.ceil(box.scrollWidth + 8)),
          0
        );

        boxes.forEach((box, index) => {
          box.style.width = previousStyles[index].width;
          box.style.maxWidth = previousStyles[index].maxWidth;
        });
      }

      applyAvailableWidth();
    };

    measureNaturalWidth();
    if (document.fonts?.status === 'loading') {
      document.fonts.ready.then(() =>
        requestAnimationFrame(measureNaturalWidth)
      );
    }

    if (typeof ResizeObserver === 'function') {
      this.singleSideResizeObserver = new ResizeObserver(() => {
        if (naturalWidth > 0) {
          applyAvailableWidth();
        } else {
          measureNaturalWidth();
        }
      });
      this.singleSideResizeObserver.observe(container);
    }
  }
}

customElements.define('timeline-card', TimelineCard);

// Register card in Home Assistant card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'timeline-card',
  name: 'Timeline Card',
  preview: true,
  description:
    'A timeline-based event history card with icons, states and WS updates.',
  getEntitySuggestion: createEntitySuggestion,
});
