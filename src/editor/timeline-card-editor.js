import { LitElement, html } from 'lit';
import editorStyles from './timeline-card-editor.css';

import './general-settings.js';
import './entity-list.js';
import './entity-editor.js';

class TimelineCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _view: { type: String }, // "main" | "card" | "entity"
      _editedEntityIndex: { type: Number },
    };
  }

  constructor() {
    super();
    this._config = {};
    this._view = 'main';
    this._editedEntityIndex = -1;
  }

  setConfig(config) {
    const normalizedEntities = (config.entities || []).map((e) =>
      typeof e === 'string' ? { entity: e } : e
    );

    this._config = { ...config, entities: normalizedEntities };

    // sane defaults for booleans
    if (this._config.show_names === undefined) this._config.show_names = true;
    if (this._config.show_states === undefined) this._config.show_states = true;
    if (this._config.show_icons === undefined) this._config.show_icons = true;
    if (this._config.show_date === undefined) this._config.show_date = true;
    if (this._config.relative_time === undefined)
      this._config.relative_time = false;
    if (this._config.allow_multiline === undefined)
      this._config.allow_multiline = false;
    if (this._config.force_multiline === undefined)
      this._config.force_multiline = false;
    if (this._config.collapse_duplicates === undefined)
      this._config.collapse_duplicates = false;
    if (this._config.compact_layout === undefined)
      this._config.compact_layout = false;
    if (!['center', 'left', 'right'].includes(this._config.card_layout)) {
      this._config.card_layout = 'center';
    }
    if (!['collapse', 'scroll'].includes(this._config.overflow)) {
      this._config.overflow = 'collapse';
    }
  }

  get value() {
    return this._config;
  }

  render() {
    if (!this._config) return html``;

    if (this._view === 'card') {
      return this._renderCardSettings();
    }

    if (this._view === 'entity') {
      return this._renderEntitySettings();
    }

    return this._renderMainView();
  }

  // MAIN VIEW
  _renderMainView() {
    return html`
      <style>
        ${editorStyles}
      </style>
      <div class="tc-editor-root">
        <div class="tc-header">
          <div class="tc-header-title">Timeline Card</div>
        </div>

        <div class="tc-section">
          <button class="tc-row-button" @click=${this._openCardSettings}>
            <div class="tc-row-button-label">
              <span class="tc-row-button-title">General settings</span>
              <span class="tc-row-button-sub">
                Configure global behaviour and layout of the timeline.
              </span>
            </div>
            <span>›</span>
          </button>
        </div>

        <timeline-card-entity-list
          .hass=${this.hass}
          .entities=${this._config.entities || []}
          @entities-changed=${this._onEntitiesChanged}
          @edit-entity=${this._onEditEntity}
        ></timeline-card-entity-list>
      </div>
    `;
  }

  // CARD SETTINGS VIEW
  _renderCardSettings() {
    return html`
      <style>
        ${editorStyles}
      </style>
      <div class="tc-editor-root">
        <div class="tc-header">
          <button
            class="tc-icon-button"
            title="Back"
            @click=${() => this._goTo('main')}
          >
            <ha-icon icon="mdi:arrow-left"></ha-icon>
          </button>
          <div class="tc-header-title">Card settings</div>
        </div>

        <timeline-card-general-settings
          .config=${this._config}
          @settings-changed=${this._onSettingsChanged}
        ></timeline-card-general-settings>
      </div>
    `;
  }

  // ENTITY SETTINGS VIEW
  _renderEntitySettings() {
    const index = this._editedEntityIndex;
    const entities = this._config.entities || [];
    const entity = index >= 0 ? entities[index] : null;

    return html`
      <style>
        ${editorStyles}
      </style>
      <div class="tc-editor-root">
        <div class="tc-header">
          <button
            class="tc-icon-button"
            title="Back"
            @click=${() => this._goTo('main')}
          >
            <ha-icon icon="mdi:arrow-left"></ha-icon>
          </button>
          <div class="tc-header-title">Entity settings</div>
        </div>

        <timeline-card-entity-editor
          .hass=${this.hass}
          .entity=${entity}
          .index=${index}
          @entity-updated=${this._onEntityUpdated}
        ></timeline-card-entity-editor>
      </div>
    `;
  }

  _openCardSettings() {
    this._goTo('card');
  }

  _goTo(view) {
    this._view = view;
  }

  _onSettingsChanged(ev) {
    const patch = ev.detail?.patch || {};
    this._config = {
      ...this._config,
      ...patch,
    };
    this._emitConfigChanged();
  }

  _onEntitiesChanged(ev) {
    const entities = ev.detail?.entities || [];
    this._config = {
      ...this._config,
      entities,
    };
    this._emitConfigChanged();
  }

  _onEditEntity(ev) {
    const idx = ev.detail?.index;
    this._editedEntityIndex = idx;
    this._goTo('entity');
  }

  _onEntityUpdated(ev) {
    const { index, entity } = ev.detail;

    const entities = [...this._config.entities];
    entities[index] = entity;

    this._config = {
      ...this._config,
      entities,
    };

    this._emitConfigChanged();
  }

  _emitConfigChanged() {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('weedpump-timeline-card-editor', TimelineCardEditor);
