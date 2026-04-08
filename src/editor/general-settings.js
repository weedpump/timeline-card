import { LitElement, html } from 'lit';
import editorStyles from './timeline-card-editor.css';
import {
  alphaToPercent,
  formatColorValue,
  parseColorValue,
  percentToAlpha,
} from './color-utils.js';

class TimelineCardGeneralSettings extends LitElement {
  static get properties() {
    return {
      config: { type: Object },
      hass: { type: Object },
    };
  }

  render() {
    if (!this.config) return html``;
    const cfg = this.config;
    const overflowMode = (cfg.overflow || 'collapse').toLowerCase();
    const isCollapseMode = overflowMode === 'collapse';
    const isScrollMode = overflowMode === 'scroll';

    return html`
      <style>
        ${editorStyles}
      </style>
      <div class="tc-editor-root">
        <!-- SECTION: General -->
        <div class="tc-section">
          <h3 class="tc-section-title">Общие</h3>
          <div class="tc-section-subtitle">Заголовок, язык и обновление.</div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- TITLE -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Заголовок</div>
                  <div class="tc-setting-description">
                    Необязательный заголовок карточки.
                  </div>
                </div>
                <ha-textfield
                  style="min-width: 200px; width: 280px; max-width: 280px;"
                  .value=${cfg.title || ''}
                  @input=${(e) => this._onTextChange('title', e.target.value)}
                ></ha-textfield>
              </div>

              <!-- LANGUAGE -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Язык</div>
                  <div class="tc-setting-description">
                    Необязательное переопределение. Пусто = автоматически из
                    HA/браузера.
                  </div>
                </div>
                <ha-selector
                  style="min-width: 200px; width: 240px;"
                  .hass=${this.hass}
                  .value=${cfg.language || ''}
                  .selector=${{
                    select: {
                      mode: 'dropdown',
                      options: [
                        { value: '', label: 'Авто' },
                        { value: 'de', label: 'Deutsch' },
                        { value: 'en-GB', label: 'English (UK)' },
                        { value: 'en-US', label: 'English (US)' },
                        { value: 'fr', label: 'Francais' },
                        { value: 'it', label: 'Italiano' },
                        { value: 'pt-br', label: 'Portugues (BR)' },
                        { value: 'ru', label: 'Русский' },
                        { value: 'sv', label: 'Svensk' },
                      ],
                    },
                  }}
                  @value-changed=${(e) =>
                    this._onSelectorChange('language', e, true)}
                ></ha-selector>
              </div>

              <!-- REFRESH INTERVAL -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Интервал обновления (с)</div>
                  <div class="tc-setting-description">
                    Необязательный интервал автообновления в секундах.
                  </div>
                </div>
                <ha-textfield
                  type="number"
                  min="1"
                  style="width: 140px;"
                  .value=${cfg.refresh_interval ?? ''}
                  @input=${(e) =>
                    this._onNumberChange('refresh_interval', e.target.value)}
                ></ha-textfield>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: Range & data -->
        <div class="tc-section">
          <h3 class="tc-section-title">Период и данные</h3>
          <div class="tc-section-subtitle">Сколько истории загружать.</div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- HOURS -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Часы</div>
                  <div class="tc-setting-description">
                    Количество часов истории для загрузки.
                  </div>
                </div>
                <ha-textfield
                  type="number"
                  min="1"
                  style="width: 140px;"
                  .value=${cfg.hours ?? ''}
                  @input=${(e) => this._onNumberChange('hours', e.target.value)}
                ></ha-textfield>
              </div>

              <!-- LIMIT -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Лимит</div>
                  <div class="tc-setting-description">
                    Максимальное количество отображаемых событий.
                  </div>
                </div>
                <ha-textfield
                  type="number"
                  min="1"
                  style="width: 140px;"
                  .value=${cfg.limit ?? ''}
                  @input=${(e) => this._onNumberChange('limit', e.target.value)}
                ></ha-textfield>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: Event display -->
        <div class="tc-section">
          <h3 class="tc-section-title">Отображение событий</h3>
          <div class="tc-section-subtitle">
            Сворачивание, прокрутка и количество видимых событий.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- VISIBLE EVENTS (collapse only) -->
              ${isCollapseMode
                ? html`
                    <div class="tc-setting-row">
                      <div class="tc-setting-label">
                        <div class="tc-setting-title">Видимые события</div>
                        <div class="tc-setting-description">
                          Показывать столько элементов до кнопки "Показать еще".
                        </div>
                      </div>
                      <ha-textfield
                        type="number"
                        min="1"
                        style="width: 140px;"
                        .value=${cfg.visible_events ?? ''}
                        @input=${(e) =>
                          this._onNumberChange(
                            'visible_events',
                            e.target.value
                          )}
                      ></ha-textfield>
                    </div>
                  `
                : ''}

              <!-- OVERFLOW MODE -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Режим переполнения</div>
                  <div class="tc-setting-description">
                    Свернуть лишние события или показывать их в области прокрутки.
                  </div>
                </div>
                <ha-selector
                  style="min-width: 180px; width: 200px;"
                  .hass=${this.hass}
                  .value=${cfg.overflow || 'collapse'}
                  .selector=${{
                    select: {
                      mode: 'dropdown',
                      options: [
                        {
                          value: 'collapse',
                          label: 'Сворачивать (показать больше/меньше)',
                        },
                        {
                          value: 'scroll',
                          label: 'Прокрутка (с учетом max height)',
                        },
                      ],
                    },
                  }}
                  @value-changed=${(e) =>
                    this._onSelectorChange('overflow', e, false, 'collapse')}
                ></ha-selector>
              </div>

              <!-- MAX HEIGHT (scroll only) -->
              ${isScrollMode
                ? html`
                    <div class="tc-setting-row">
                      <div class="tc-setting-label">
                        <div class="tc-setting-title">Максимальная высота</div>
                        <div class="tc-setting-description">
                          Ограничение высоты карточки (например, 220px или 14rem).
                        </div>
                      </div>
                      <ha-textfield
                        style="width: 180px;"
                        .value=${cfg.max_height ?? ''}
                        @input=${(e) =>
                          this._onTextChange('max_height', e.target.value)}
                      ></ha-textfield>
                    </div>
                  `
                : ''}
            </div>
          </div>
        </div>

        <!-- SECTION: Layout -->
        <div class="tc-section">
          <h3 class="tc-section-title">Расположение</h3>
          <div class="tc-section-subtitle">
            Положение линии таймлайна и карточек событий.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Макет карточки</div>
                  <div class="tc-setting-description">
                    Переключение между центральным (чередующимся) и
                    односторонними макетами.
                  </div>
                </div>
                <ha-selector
                  style="min-width: 200px; width: 240px;"
                  .hass=${this.hass}
                  .value=${cfg.card_layout || 'center'}
                  .selector=${{
                    select: {
                      mode: 'dropdown',
                      options: [
                        { value: 'center', label: 'Центр (чередование)' },
                        { value: 'left', label: 'Линия слева, карточки справа' },
                        { value: 'right', label: 'Линия справа, карточки слева' },
                      ],
                    },
                  }}
                  @value-changed=${(e) =>
                    this._onSelectorChange('card_layout', e, false, 'center')}
                ></ha-selector>
              </div>

              ${this._compactRow(cfg)}
            </div>
          </div>
        </div>

        <!-- SECTION: Content -->
        <div class="tc-section">
          <h3 class="tc-section-title">Содержимое</h3>
          <div class="tc-section-subtitle">Что отображать в каждом событии.</div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              ${this._booleanRow(
                'Показывать имена',
                'Показывать имя сущности в таймлайне.',
                'show_names',
                cfg.show_names ?? true
              )}
              ${this._booleanRow(
                'Показывать состояния',
                'Показывать состояние рядом с именем.',
                'show_states',
                cfg.show_states ?? true
              )}
              ${this._booleanRow(
                'Показывать иконки',
                'Показывать иконку сущности у каждого события.',
                'show_icons',
                cfg.show_icons ?? true
              )}
              ${this._booleanRow(
                'Использовать относительное время',
                'Показывать время в формате "5 минут назад".',
                'relative_time',
                cfg.relative_time ?? false
              )}
              ${this._booleanRow(
                'Показывать дату',
                'Добавлять дату для абсолютного времени; отключите, чтобы показывать только время.',
                'show_date',
                cfg.show_date ?? true
              )}
            </div>
          </div>
        </div>

        <!-- SECTION: Text formatting -->
        <div class="tc-section">
          <h3 class="tc-section-title">Формат текста</h3>
          <div class="tc-section-subtitle">
            Перенос строк для имен и состояний.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              ${this._booleanRow(
                'Разрешить многострочный текст',
                'Разрешить перенос имен и состояний на несколько строк.',
                'allow_multiline',
                cfg.allow_multiline ?? false
              )}
              ${this._booleanRow(
                'Принудительно многострочно',
                'Всегда переносить состояние на новую строку под именем.',
                'force_multiline',
                cfg.force_multiline ?? false
              )}
            </div>
          </div>
        </div>

        <!-- SECTION: Duplicates -->
        <div class="tc-section">
          <h3 class="tc-section-title">Дубликаты и фильтры</h3>
          <div class="tc-section-subtitle">
            Глобально скрывать повторяющиеся подряд состояния.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              ${this._booleanRow(
                'Скрывать дубликаты',
                'Скрывать последовательные события с одинаковым состоянием.',
                'collapse_duplicates',
                cfg.collapse_duplicates ?? false
              )}
            </div>
          </div>
        </div>

        <!-- SECTION: Colors -->
        <div class="tc-section">
          <h3 class="tc-section-title">Цвета</h3>
          <div class="tc-section-subtitle">
            Необязательные статические цвета для карточки и текста.
          </div>
          <div class="tc-card-block">
            <div class="tc-form-group">
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  'card_background',
                  cfg.card_background,
                  'Цвет фона карточки'
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  'timeline_color_start',
                  cfg.timeline_color_start,
                  'Начало градиента линии',
                  '#2da8ff'
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  'timeline_color_end',
                  cfg.timeline_color_end,
                  'Конец градиента линии',
                  '#b24aff'
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  'dot_color',
                  cfg.dot_color,
                  'Цвет точки',
                  '#31a8ff'
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  'name_color',
                  cfg.name_color,
                  'Цвет имени'
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  'state_color',
                  cfg.state_color,
                  'Цвет состояния'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _booleanRow(title, description, key, value, disabled = false) {
    return html`
      <div class="tc-setting-row">
        <div class="tc-setting-label">
          <div class="tc-setting-title">${title}</div>
          ${description
            ? html`<div class="tc-setting-description">${description}</div>`
            : ''}
        </div>
        <ha-switch
          .checked=${value}
          ?disabled=${disabled}
          @change=${(e) => this._onToggle(key, e)}
        ></ha-switch>
      </div>
    `;
  }

  _onToggle(key, ev) {
    const patch = { [key]: ev.target.checked };
    this.dispatchEvent(
      new CustomEvent('settings-changed', {
        detail: { patch },
        bubbles: true,
        composed: true,
      })
    );
  }

  _renderColorPicker(key, value, label, fallbackHex) {
    const parsed = parseColorValue(value, fallbackHex);
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
              this._onColorChange(key, e.target.value, parsed.alpha)}
          />
          <input
            class="tc-color-alpha"
            type="range"
            min="0"
            max="100"
            .value=${alphaPercent}
            @input=${(e) =>
              this._onColorChange(
                key,
                parsed.hex,
                percentToAlpha(e.target.value)
              )}
          />
          <button
            class="tc-icon-button"
            title="Сбросить цвет"
            @click=${() => this._onColorChange(key, undefined)}
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
      </div>
    `;
  }

  _onColorChange(key, value, alpha) {
    if (!value) {
      const patch = { [key]: undefined };
      this.dispatchEvent(
        new CustomEvent('settings-changed', {
          detail: { patch },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    const parsed = parseColorValue(value);
    const resolvedAlpha = typeof alpha === 'number' ? alpha : parsed.alpha;
    const formatted = formatColorValue(parsed.hex, resolvedAlpha);
    const patch = { [key]: formatted || undefined };
    this.dispatchEvent(
      new CustomEvent('settings-changed', {
        detail: { patch },
        bubbles: true,
        composed: true,
      })
    );
  }

  _onNumberChange(key, rawValue) {
    const text = `${rawValue ?? ''}`.trim();
    if (!text) {
      this._emitPatch({ [key]: undefined });
      return;
    }
    const num = parseInt(text, 10);
    if (Number.isNaN(num)) return;
    this._emitPatch({ [key]: num });
  }

  _onTextChange(key, value) {
    const v = (value || '').trim();
    this._emitPatch({ [key]: v || undefined });
  }

  _onSelectChange(key, rawValue, keepEmpty = false, fallbackValue) {
    const val = `${rawValue ?? ''}`.trim();
    const patch = { [key]: val || (keepEmpty ? '' : undefined) };

    if (!val && fallbackValue) {
      patch[key] = fallbackValue;
    }

    // If layout switches away from center, turn off compact to avoid invalid combo
    if (key === 'card_layout' && val && val !== 'center') {
      patch.compact_layout = false;
    }

    this._emitPatch(patch);
  }

  _onSelectorChange(key, ev, keepEmpty = false, fallbackValue) {
    const eventValue =
      ev?.detail?.value ??
      ev?.target?.value ??
      ev?.target?.__value ??
      ev?.target?.configValue ??
      '';
    // Debug info for HA selector regressions across frontend versions.
    console.debug('[Timeline Card] ha-selector event', {
      key,
      type: ev?.type,
      eventValue,
      targetValue: ev?.target?.value,
      detailValue: ev?.detail?.value,
      target: ev?.target?.tagName,
      detail: ev?.detail,
    });
    this._onSelectChange(key, eventValue, keepEmpty, fallbackValue);
  }

  _compactRow(cfg) {
    const layout = cfg.card_layout || 'center';
    const disabled = layout !== 'center';
    const desc = disabled
      ? 'Доступно только для макета "Центр".'
      : 'Перекрывать ряды, чтобы уменьшить вертикальную высоту таймлайна.';
    return this._booleanRow(
      'Компактный макет',
      desc,
      'compact_layout',
      cfg.compact_layout ?? false,
      disabled
    );
  }

  _emitPatch(patch) {
    this.dispatchEvent(
      new CustomEvent('settings-changed', {
        detail: { patch },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define(
  'timeline-card-general-settings',
  TimelineCardGeneralSettings
);
