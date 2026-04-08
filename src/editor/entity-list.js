import { LitElement, html } from 'lit';
import editorStyles from './timeline-card-editor.css';

class TimelineCardEntityList extends LitElement {
  static get properties() {
    return {
      entities: { type: Array },
      hass: { type: Object },
      _newEntityId: { type: String },
    };
  }

  constructor() {
    super();
    this.entities = [];
    this._newEntityId = '';
  }

  render() {
    const entities = this.entities || [];

    return html`
      <style>
        ${editorStyles}
      </style>

      <div class="tc-section">
        <div class="tc-entities-list">
          <div class="tc-entities-header">
            <div class="tc-entities-title">Сущности</div>
          </div>

          ${entities.length === 0
            ? html`<div style="font-size: 13px; opacity: 0.7;">
                Сущности еще не настроены.
              </div>`
            : entities.map((e, idx) => this._renderEntityRow(e, idx))}

          <!-- ADD NEW ENTITY -->
          <div
            class="tc-add-entity"
            style="display: flex; gap: 8px; align-items: center;"
          >
            <ha-selector
              style="flex: 1;"
              .hass=${this.hass}
              .value=${this._newEntityId}
              .selector=${{ entity: {} }}
              @value-changed=${this._onEntityPicked}
            ></ha-selector>

            <button
              class="tc-btn-primary"
              @click=${this._addEntity}
              ?disabled=${!this._newEntityId}
            >
              Добавить
            </button>
          </div>

          <div class="tc-muted">
            Сущности сначала добавляются как обычные записи
            <code>entity:</code>. Детальную настройку можно сделать позже в
            редакторе сущности.
          </div>
        </div>
      </div>
    `;
  }

  _renderEntityRow(entityCfg, index) {
    const id = typeof entityCfg === 'string' ? entityCfg : entityCfg.entity;

    return html`
      <div class="tc-entity-row">
        <!-- ENTITY PICKER (EDITABLE) -->
        <ha-selector
          style="flex: 1;"
          .hass=${this.hass}
          .value=${id}
          .selector=${{ entity: {} }}
          @value-changed=${(e) => this._onEntityReplaced(index, e)}
        ></ha-selector>

        <div class="tc-entity-actions">
          <button
            class="tc-icon-button"
            title="Редактировать сущность"
            @click=${() => this._editEntity(index)}
          >
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>

          <button
            class="tc-icon-button"
            title="Удалить сущность"
            @click=${() => this._removeEntity(index)}
          >
            <ha-icon icon="mdi:delete"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  //
  // VALUE EXTRACTOR — HA entity selectors vary by version
  //
  _extractEntityId(sel) {
    if (!sel) return '';

    if (typeof sel === 'string') return sel;
    if (sel.entity_id) return sel.entity_id;
    if (sel.entity) return sel.entity;
    if (sel.value) return sel.value;

    return '';
  }

  //
  // ADD NEW ENTITY
  //
  _onEntityPicked(ev) {
    const pickedValue = ev.detail?.value;
    this._newEntityId = this._extractEntityId(pickedValue);
    console.debug('[Timeline Card] ha-selector add entity', {
      type: ev?.type,
      rawValue: pickedValue,
      extractedEntityId: this._newEntityId,
      detail: ev?.detail,
    });
  }

  _addEntity() {
    const id = this._newEntityId;
    if (!id) return;

    const list = [...(this.entities || [])];
    list.push({ entity: id });

    this._newEntityId = '';

    this._emitEntitiesChanged(list);
  }

  //
  // REPLACE EXISTING ENTITY
  //
  _onEntityReplaced(index, ev) {
    const selectorValue = ev.detail?.value;
    const id = this._extractEntityId(selectorValue);
    console.debug('[Timeline Card] ha-selector replace entity', {
      index,
      type: ev?.type,
      rawValue: selectorValue,
      extractedEntityId: id,
      detail: ev?.detail,
    });
    if (!id) return;

    const list = [...this.entities];
    list[index] = { ...list[index], entity: id };

    this._emitEntitiesChanged(list);
  }

  //
  // REMOVE ENTITY
  //
  _removeEntity(index) {
    const list = [...this.entities];
    list.splice(index, 1);
    this._emitEntitiesChanged(list);
  }

  //
  // OPEN ENTITY EDITOR
  //
  _editEntity(index) {
    this.dispatchEvent(
      new CustomEvent('edit-entity', {
        detail: { index },
        bubbles: true,
        composed: true,
      })
    );
  }

  //
  // BUBBLE CHANGES
  //
  _emitEntitiesChanged(list) {
    this.dispatchEvent(
      new CustomEvent('entities-changed', {
        detail: { entities: list },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('timeline-card-entity-list', TimelineCardEntityList);
