import { LitElement, html } from 'lit';
import editorStyles from './timeline-card-editor.css';
import {
  alphaToPercent,
  formatColorValue,
  parseColorValue,
  percentToAlpha,
} from './color-utils.js';

class TimelineCardEntityEditor extends LitElement {
  static get properties() {
    return {
      entity: { type: Object },
      index: { type: Number },
      hass: { type: Object },
    };
  }

  render() {
    if (!this.entity) {
      return html`
        <style>
          ${editorStyles}
        </style>
        <div class="tc-editor-root">
          <div class="tc-placeholder">No entity selected.</div>
        </div>
      `;
    }

    const entityId = this.entity.entity;
    const stateObj = this.hass?.states?.[entityId];
    const friendlyName = stateObj?.attributes?.friendly_name || entityId;

    const domain = entityId?.split('.')[0] ?? 'sensor';
    const defaultDomainIcons = {
      lock: 'mdi:lock',
      sensor: 'mdi:information-outline',
      binary_sensor: 'mdi:eye',
      light: 'mdi:lightbulb',
      switch: 'mdi:toggle-switch',
    };
    const entityIcon = defaultDomainIcons[domain] || 'mdi:information-outline';

    const cfg = this.entity;
    const hasIncludeStates =
      Array.isArray(cfg.include_states) && cfg.include_states.length > 0;
    const hasExcludeStates =
      Array.isArray(cfg.exclude_states) && cfg.exclude_states.length > 0;
    const includeDisabled = hasExcludeStates;
    const excludeDisabled = hasIncludeStates;

    return html`
      <style>
        ${editorStyles}
      </style>
      <div class="tc-editor-root">
        <!-- OVERVIEW -->
        <div class="tc-section">
          <h3 class="tc-section-title">Entity overview</h3>

          <div
            class="tc-card-block"
            style="display:flex; gap:12px; align-items:flex-start;"
          >
            <ha-icon
              icon="${entityIcon}"
              style="--mdc-icon-size: 24px;"
            ></ha-icon>
            <div style="flex:1;">
              <div style="font-size:15px; font-weight:600;">
                ${friendlyName}
              </div>
              <div style="font-size:13px; opacity:0.7;">${entityId}</div>
            </div>
          </div>
        </div>

        <!-- DISPLAY -->
        <div class="tc-section">
          <h3 class="tc-section-title">Display</h3>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- CUSTOM NAME -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Custom name</div>
                </div>

                <ha-textfield
                  style="min-width: 200px; width: 280px; max-width: 280px;"
                  .value=${cfg.name || ''}
                  @input=${(e) => this._updateField('name', e.target.value)}
                ></ha-textfield>
              </div>

              <!-- CUSTOM ICON -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Custom icon</div>
                </div>

                <ha-icon-picker
                  style="min-width: 200px; width: 280px; max-width: 280px;"
                  .value=${cfg.icon || ''}
                  @value-changed=${(e) =>
                    this._updateField('icon', e.detail.value)}
                ></ha-icon-picker>
              </div>

              ${this._booleanRow(
                'Use entity picture (if available)',
                'Show the entity picture instead of the icon when provided.',
                'show_entity_picture',
                cfg.show_entity_picture ?? null
              )}

              <!-- COLORS -->
              <div class="tc-setting-block">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Colors</div>
                  <div class="tc-setting-description">
                    Optional static colors for icon, name and state.
                  </div>
                </div>
                <div class="tc-color-row">
                  ${this._renderColorPicker(
                    'icon_color',
                    cfg.icon_color,
                    'Icon color'
                  )}
                </div>
                <div class="tc-color-row">
                  ${this._renderColorPicker(
                    'name_color',
                    cfg.name_color,
                    'Name color'
                  )}
                </div>
                <div class="tc-color-row">
                  ${this._renderColorPicker(
                    'state_color',
                    cfg.state_color,
                    'State color'
                  )}
                </div>
              </div>

              <!-- COLLAPSE DUPLICATES -->
              ${this._booleanRow(
                'Collapse duplicates (entity level)',
                'Hide consecutive identical states for this entity.',
                'collapse_duplicates',
                cfg.collapse_duplicates ?? null
              )}

              <!-- INCLUDE STATES (YAML ONLY) -->
              <div class="tc-setting-row" style="align-items: flex-start;">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Include states</div>
                  <div class="tc-setting-description">
                    Only show events matching this YAML list:
                    <pre>
- open
- closed
- jammed</pre
                    >
                  </div>
                </div>

                <textarea
                  style="
                    min-width: 200px;
                    width: 240px;
                    min-height: 110px;
                    background: var(--card-background-color);
                    color: var(--primary-text-color);
                    border: 1px solid var(--divider-color);
                    border-radius: 6px;
                    padding: 6px;
                    resize: vertical;
                    font-family: monospace;
                    font-size: 13px;
                  "
                  ?disabled=${includeDisabled}
                  .value=${this._stringifyStateList(cfg.include_states)}
                  @input=${(e) =>
                    this._updateField(
                      'include_states',
                      this._parseStateList(e.target.value)
                    )}
                ></textarea>
              </div>

              <!-- EXCLUDE STATES (YAML ONLY) -->
              <div class="tc-setting-row" style="align-items: flex-start;">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Exclude states</div>
                  <div class="tc-setting-description">
                    Hide events matching this YAML list:
                    <pre>
- idle
- unknown
- unavailable</pre
                    >
                  </div>
                </div>

                <textarea
                  style="
                    min-width: 200px;
                    width: 240px;
                    min-height: 110px;
                    background: var(--card-background-color);
                    color: var(--primary-text-color);
                    border: 1px solid var(--divider-color);
                    border-radius: 6px;
                    padding: 6px;
                    resize: vertical;
                    font-family: monospace;
                    font-size: 13px;
                  "
                  ?disabled=${excludeDisabled}
                  .value=${this._stringifyStateList(cfg.exclude_states)}
                  @input=${(e) =>
                    this._updateField(
                      'exclude_states',
                      this._parseStateList(e.target.value)
                    )}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- COLORS -->
        <div class="tc-section">
          <h3 class="tc-section-title">State mapping</h3>
          <div class="tc-card-block">
            <div class="tc-form-group">
              <div class="tc-setting-block">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">State label map</div>
                  <div class="tc-setting-description">
                    Override displayed labels per raw state.
                  </div>
                </div>
                ${this._renderMapEditor('state_map', cfg.state_map, 'Label')}
              </div>

              <div class="tc-setting-block">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Icon map</div>
                  <div class="tc-setting-description">
                    Select icons per state (uses MDI names).
                  </div>
                </div>
                ${this._renderIconMapEditor('icon_map', cfg.icon_map)}
              </div>

              <div class="tc-setting-block">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Icon color map</div>
                  <div class="tc-setting-description">
                    Hex/RGB color per state.
                  </div>
                </div>
                ${this._renderColorMapEditor(
                  'icon_color_map',
                  cfg.icon_color_map
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ------------------------
     STATE LISTS (YAML)
  -------------------------*/

  _stringifyStateList(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.map((s) => `- ${s}`).join('\n');
  }

  _parseStateList(text) {
    if (!text.trim()) return undefined;

    const list = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '))
      .map((line) => line.substring(2))
      .filter((v) => v.length > 0);

    return list.length ? list : undefined;
  }

  /* ------------------------
     BOOLEAN ROW
  -------------------------*/

  _booleanRow(title, description, key, value) {
    return html`
      <div class="tc-setting-row">
        <div class="tc-setting-label">
          <div class="tc-setting-title">${title}</div>
          <div class="tc-setting-description">${description}</div>
        </div>
        <ha-switch
          .checked=${value === true}
          @change=${(e) => this._onToggle(key, e)}
        ></ha-switch>
      </div>
    `;
  }

  _onToggle(key, ev) {
    this._updateField(key, ev.target.checked);
  }

  /* ------------------------
     CONFIG PATCH
  -------------------------*/

  _updateField(key, value) {
    if (value === undefined) {
      // clear key from entity config
      const { [key]: _, ...rest } = this.entity;
      return this._emitUpdate(rest);
    }

    const newCfg = {
      ...this.entity,
      [key]: value === '' ? undefined : value,
    };

    this._emitUpdate(newCfg);
  }

  _emitUpdate(entity) {
    this.dispatchEvent(
      new CustomEvent('entity-updated', {
        detail: { index: this.index, entity },
        bubbles: true,
        composed: true,
      })
    );
  }

  /* ------------------------
     MAP EDITOR HELPERS
  -------------------------*/

  _renderMapEditor(mapKey, mapObj = {}, placeholder = '') {
    const entries = Object.entries(mapObj || {});

    return html`
      <div class="tc-map-editor">
        ${entries.length === 0
          ? html`<div class="tc-muted" style="margin-bottom:6px;">
              No entries yet.
            </div>`
          : entries.map(
              ([state, value]) => html`
                <div class="tc-map-row tc-map-row-icon">
                  <ha-textfield
                    class="tc-map-key"
                    label="State"
                    .value=${state}
                    @input=${(e) =>
                      this._onMapKeyChange(mapKey, state, e.target.value)}
                  ></ha-textfield>
                  <ha-textfield
                    class="tc-map-value"
                    label="Value"
                    .value=${value}
                    placeholder=${placeholder}
                    @input=${(e) =>
                      this._updateMap(mapKey, state, e.target.value)}
                  ></ha-textfield>
                  <button
                    class="tc-icon-button"
                    title="Remove entry"
                    @click=${() => this._removeMapEntry(mapKey, state)}
                  >
                    <ha-icon icon="mdi:delete"></ha-icon>
                  </button>
                </div>
              `
            )}

        <button
          class="tc-btn-secondary"
          style="margin-top:6px;"
          @click=${() => this._addMapEntry(mapKey)}
        >
          Add entry
        </button>
      </div>
    `;
  }

  _addMapEntry(mapKey) {
    const map = { ...(this.entity[mapKey] || {}) };
    const newKey = this._suggestNextKey(map);
    map[newKey] = '';
    this._updateField(mapKey, map);
  }

  _renderIconMapEditor(mapKey, mapObj = {}) {
    const entries = Object.entries(mapObj || {});

    return html`
      <div class="tc-map-editor">
        ${entries.length === 0
          ? html`<div class="tc-muted" style="margin-bottom:6px;">
              No entries yet.
            </div>`
          : entries.map(
              ([state, value]) => html`
                <div class="tc-map-row">
                  <ha-textfield
                    class="tc-map-key"
                    label="State"
                    .value=${state}
                    @input=${(e) =>
                      this._onMapKeyChange(mapKey, state, e.target.value)}
                  ></ha-textfield>
                  <ha-icon-picker
                    class="tc-map-icon"
                    .value=${value}
                    @value-changed=${(e) =>
                      this._updateMap(mapKey, state, e.detail.value)}
                  ></ha-icon-picker>
                  <button
                    class="tc-icon-button"
                    title="Remove entry"
                    @click=${() => this._removeMapEntry(mapKey, state)}
                  >
                    <ha-icon icon="mdi:delete"></ha-icon>
                  </button>
                </div>
              `
            )}

        <button
          class="tc-btn-secondary"
          style="margin-top:6px;"
          @click=${() => this._addMapEntry(mapKey)}
        >
          Add entry
        </button>
      </div>
    `;
  }

  _renderColorMapEditor(mapKey, mapObj = {}) {
    const entries = Object.entries(mapObj || {});

    return html`
      <div class="tc-map-editor">
        ${entries.length === 0
          ? html`<div class="tc-muted" style="margin-bottom:6px;">
              No entries yet.
            </div>`
          : entries.map(
              ([state, value]) => html`
                <div class="tc-map-row tc-map-row-color">
                  <ha-textfield
                    class="tc-map-key"
                    label="State"
                    .value=${state}
                    @input=${(e) =>
                      this._onMapKeyChange(mapKey, state, e.target.value)}
                  ></ha-textfield>
                  ${this._renderMapColorPicker(mapKey, state, value)}
                  <button
                    class="tc-icon-button"
                    title="Remove entry"
                    @click=${() => this._removeMapEntry(mapKey, state)}
                  >
                    <ha-icon icon="mdi:delete"></ha-icon>
                  </button>
                </div>
              `
            )}

        <button
          class="tc-btn-secondary"
          style="margin-top:6px;"
          @click=${() => this._addMapEntry(mapKey)}
        >
          Add entry
        </button>
      </div>
    `;
  }

  _suggestNextKey(mapObj) {
    const base = 'state';
    let idx = 1;
    while (mapObj[`${base}${idx}`]) idx += 1;
    return `${base}${idx}`;
  }

  _onMapKeyChange(mapKey, oldKey, newKey) {
    const nextKey = (newKey || '').trim();
    if (!nextKey) return;
    if (nextKey === oldKey) return;

    const current = { ...(this.entity[mapKey] || {}) };
    const value = current[oldKey];
    delete current[oldKey];
    current[nextKey] = value;

    this._updateField(mapKey, current);
  }

  _updateMap(key, stateKey, value) {
    const map = { ...(this.entity[key] || {}) };
    map[stateKey] = value;
    this._updateField(key, map);
  }

  _removeMapEntry(key, stateKey) {
    const map = { ...(this.entity[key] || {}) };
    delete map[stateKey];
    this._updateField(key, Object.keys(map).length ? map : undefined);
  }

  _renderColorPicker(key, value, label) {
    const parsed = parseColorValue(value);
    const alphaPercent = alphaToPercent(parsed.alpha);
    return html`
      <div class="tc-color-picker">
        <label class="tc-color-label">${label}</label>
        <div class="tc-color-input-row">
          <input
            class="tc-color-input"
            type="color"
            .value=${parsed.hex}
            @input=${(e) =>
              this._updateField(
                key,
                formatColorValue(e.target.value, parsed.alpha)
              )}
          />
          <input
            class="tc-color-alpha"
            type="range"
            min="0"
            max="100"
            .value=${alphaPercent}
            @input=${(e) =>
              this._updateField(
                key,
                formatColorValue(parsed.hex, percentToAlpha(e.target.value))
              )}
          />
          <button
            class="tc-icon-button"
            title="Clear color"
            @click=${() => this._updateField(key, undefined)}
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  _renderMapColorPicker(mapKey, state, value) {
    const parsed = parseColorValue(value);
    const alphaPercent = alphaToPercent(parsed.alpha);

    return html`
      <div class="tc-color-input-row tc-color-input-row-map">
        <input
          class="tc-color-input"
          type="color"
          .value=${parsed.hex}
          @input=${(e) =>
            this._updateMap(
              mapKey,
              state,
              formatColorValue(e.target.value, parsed.alpha)
            )}
        />
        <input
          class="tc-color-alpha"
          type="range"
          min="0"
          max="100"
          .value=${alphaPercent}
          @input=${(e) =>
            this._updateMap(
              mapKey,
              state,
              formatColorValue(parsed.hex, percentToAlpha(e.target.value))
            )}
        />
      </div>
    `;
  }
}

customElements.define('timeline-card-entity-editor', TimelineCardEntityEditor);
