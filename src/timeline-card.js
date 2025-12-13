import enUS from "./locales/en-US.json";
import enGB from "./locales/en-GB.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import ptBR from "./locales/pt-BR.json";
import styles from "./timeline-card.css";

import "./editor/timeline-card-editor.js";

import { TranslationEngine } from "./translation-engine.js";
import { relativeTime, formatAbsoluteTime } from "./time-engine.js";

import { fetchHistory } from "./history-fetch.js";
import { transformHistory } from "./history-transform.js";
import { filterHistory } from "./history-filter.js";

import { getCachedHistory, setCachedHistory } from "./history-cache.js";

// Unified state transformer for both history + live
import { transformState } from "./state-transform.js";

const translations = {
  "en-us": enUS,
  "en-gb": enGB,
  de,
  fr,
  "pt-br": ptBR,
};

class TimelineCard extends HTMLElement {

  static getConfigElement() {
    return document.createElement("timeline-card-editor");
  }

  static getStubConfig(hass, entities) {
    const firstEntityId = entities && Object.keys(entities).length
      ? Object.keys(entities)[0]
      : undefined;

    return {
      type: "custom:timeline-card",
      title: "Timeline",
      hours: 6,
      limit: 10,
      relative_time: true,
      show_names: true,
      show_states: true,
      show_icons: true,
      entities: firstEntityId ? [firstEntityId] : [],
    };
  }

  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Please define 'entities' as a list.");
    }

    this.entities = config.entities.map((e) =>
      typeof e === "string"
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
    this.title = typeof config.title === "string" ? config.title : "";

    this.relativeTimeEnabled = config.relative_time ?? false;
    this.showStates = config.show_states ?? true;
    this.showNames = config.show_names ?? true;
    this.showIcons = config.show_icons ?? true;

    this.allowMultiline = config.allow_multiline ?? false;
    this.compactLayout = config.compact_layout ?? false;

    // NEW: global colors
    this.nameColor = config.name_color || null;
    this.stateColor = config.state_color || null;

    // Overflow handling
    const visibleRaw = config.visible_events;
    const visibleParsed =
      typeof visibleRaw === "string" ? parseInt(visibleRaw, 10) : visibleRaw;
    this.visibleEventCount =
      Number.isInteger(visibleParsed) && visibleParsed > 0
        ? visibleParsed
        : null;
    const overflow = (config.overflow || "collapse").toLowerCase();
    this.overflowMode = overflow === "scroll" ? "scroll" : "collapse";
    this.maxHeight = config.max_height || null;
    this.expanded = false;

    this.refreshInterval = config.refresh_interval || null;
    this.refreshTimer = null;

    this.liveUnsub = null;

    this.items = [];
    this.loaded = false;
    this.config = config;
  }

  set hass(hass) {
    this.hassInst = hass;

    if (!this.loaded) {
      this.loaded = true;

      const yamlLang = this.config.language;
      const haLang = hass?.locale?.language;
      const browserLang = navigator.language;

      this.language = yamlLang || haLang || browserLang || "en-US";

      this.i18n = new TranslationEngine(translations);

      this.i18n.load(this.language).then(() => {
        // Keep the full normalized language code so region-specific formats work.
        this.languageCode = this.i18n.langCode || this.language.toLowerCase();
        this.loadHistory();

        if (this.refreshInterval && !this.refreshTimer) {
          this.startAutoRefresh();
        }
      });
    }

    if (this.hassInst?.connection && !this.liveUnsub) {
      this.startLiveEvents();
    }
  }

  async loadHistory() {
    const cached = getCachedHistory(
      this.entities,
      this.hours,
      this.languageCode
    );

    if (cached) {
      this.items = cached;
      this.render();
      this.refreshInBackground();
      return;
    }

    await this.refreshInForeground();
  }

  async refreshInForeground() {
    const raw = await fetchHistory(this.hassInst, this.entities, this.hours);

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
      this.config // enthält collapse_duplicates
    );

    setCachedHistory(this.entities, this.hours, this.languageCode, items);

    this.items = items;
    this.render();
  }

  async refreshInBackground() {
    const raw = await fetchHistory(this.hassInst, this.entities, this.hours);

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
      this.config // enthält collapse_duplicates
    );

    if (JSON.stringify(items) === JSON.stringify(this.items)) return;

    setCachedHistory(this.entities, this.hours, this.languageCode, items);

    this.items = items;
    this.render();
  }

  startAutoRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);

    this.refreshTimer = setInterval(() => {
      console.debug("TimelineCard Auto-Refresh");
      this.refreshInBackground();
    }, this.refreshInterval * 1000);
  }

  startLiveEvents() {
    const entityIds = this.entities.map((e) => e.entity);

    this.liveUnsub = this.hassInst.connection.subscribeEvents((msg) => {
      const data = msg?.data;
      if (!data?.entity_id) return;
      if (!entityIds.includes(data.entity_id)) return;

      this.processLiveEvent(data);
    }, "state_changed");
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
      const last = this.items[0];
      if (last && last.id === item.id && last.raw_state === item.raw_state) {
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
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (typeof this.liveUnsub === "function") {
      this.liveUnsub();
    }
    this.liveUnsub = null;
  }

  // ------------------------------------
  // Helper: Capitalize state string
  // ------------------------------------
  capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ------------------------------------
  // RENDER CARD
  // ------------------------------------
  render() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });

    if (!this.items.length) {
      root.innerHTML = `
        <style>${styles}</style>
        <ha-card>
          <div style="padding:12px">Keine Ereignisse in diesem Zeitraum.</div>
        </ha-card>
      `;
      return;
    }

    const overflowMode =
      this.overflowMode === "scroll" ? "scroll" : "collapse";
    const hasVisibleLimit =
      overflowMode === "collapse" &&
      Number.isInteger(this.visibleEventCount) &&
      this.visibleEventCount > 0;
    const visibleLimit = hasVisibleLimit ? this.visibleEventCount : null;

    const shouldCollapse =
      overflowMode === "collapse" &&
      visibleLimit !== null &&
      !this.expanded &&
      this.items.length > visibleLimit;

    const hiddenCount =
      overflowMode === "collapse" && visibleLimit
        ? Math.max(this.items.length - visibleLimit, 0)
        : 0;

    const renderedItems = shouldCollapse
      ? this.items.slice(0, visibleLimit)
      : this.items;

    const rows = renderedItems
      .map((item, index) => {
        const side = index % 2 === 0 ? "left" : "right";

        const entityCfg = item.entityCfg || {};

        // COLOR RESOLUTION: entity → card → theme/css
        const nameColor = entityCfg.name_color || this.nameColor || "";
        const stateColor = entityCfg.state_color || this.stateColor || "";

        return `
          <div class="timeline-row">
            <div class="side left">
              ${
                side === "left"
                  ? `
                  <div class="event-box ${
                    this.allowMultiline ? "auto-multiline" : ""
                  }">
                    ${
                      this.showIcons
                        ? `<ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>`
                        : ``
                    }
                    <div class="text">
                      <div class="row">
                        ${
                          this.showNames
                            ? `<div class="primary-text" style="${
                                nameColor ? `color:${nameColor};` : ""
                              }">${item.name}</div>`
                            : ``
                        }
                        ${
                          this.showStates
                            ? this.showNames
                              ? `<div class="secondary-text" style="${
                                  stateColor ? `color:${stateColor};` : ""
                                }">(${item.state})</div>`
                              : `<div class="primary-text" style="${
                                  stateColor ? `color:${stateColor};` : ""
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
                                this.i18n
                              )
                        }
                      </div>
                    </div>
                  </div>
                `
                  : ""
              }
            </div>

            <div class="dot"></div>

            <div class="side right">
              ${
                side === "right"
                  ? `
                  <div class="event-box ${
                    this.allowMultiline ? "auto-multiline" : ""
                  }">
                    ${
                      this.showIcons
                        ? `<ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>`
                        : ``
                    }
                    <div class="text">
                      <div class="row">
                        ${
                          this.showNames
                            ? `<div class="primary-text" style="${
                                nameColor ? `color:${nameColor};` : ""
                              }">${item.name}</div>`
                            : ``
                        }
                        ${
                          this.showStates
                            ? this.showNames
                              ? `<div class="secondary-text" style="${
                                  stateColor ? `color:${stateColor};` : ""
                                }">(${item.state})</div>`
                              : `<div class="primary-text" style="${
                                  stateColor ? `color:${stateColor};` : ""
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
                                this.i18n
                              )
                        }
                      </div>
                    </div>
                  </div>
                `
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");

    const containerStyles = [];
    if (this.maxHeight) {
      const value =
        typeof this.maxHeight === "number"
          ? `${this.maxHeight}px`
          : `${this.maxHeight}`;
      containerStyles.push(`max-height:${value};`);
    }
    if (overflowMode === "scroll" || containerStyles.length) {
      containerStyles.push("overflow-y:auto;");
    }
    const containerStyle = containerStyles.join("");

    const collapseToggle =
      overflowMode === "collapse" && hiddenCount > 0
        ? `
          <div class="toggle-row">
            <button class="toggle-button" type="button" id="tc-toggle-hidden" aria-expanded="${this.expanded}">
              ${
                this.expanded
                  ? this.i18n.t("ui.show_less")
                  : this.i18n.t("ui.show_more", { n: hiddenCount })
              }
            </button>
          </div>
        `
        : "";

    root.innerHTML = `
      <style>${styles}</style>
      <ha-card>
        ${this.title ? `<h1 class="card-title">${this.title}</h1>` : ""}
        <div class="timeline-container ${
          overflowMode === "scroll" ? "scrollable" : ""
        }" style="${containerStyle}">
          <div class="wrapper ${this.compactLayout ? "compact" : ""}">
            <div class="timeline-line"></div>
            ${rows}
          </div>
        </div>
        ${collapseToggle}
      </ha-card>
    `;

    const toggleBtn = root.getElementById("tc-toggle-hidden");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.expanded = !this.expanded;
        this.render();
      });
    }
  }

  getCardSize() {
    return this.visibleEventCount || this.limit || 3;
  }
}

customElements.define("timeline-card", TimelineCard);

// Register card in Home Assistant card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "timeline-card",
  name: "Timeline Card",
  description:
    "A timeline-based event history card with icons, states and WS updates.",
});
