import { LitElement, html } from "lit";
import editorStyles from "./timeline-card-editor.css";
import {
  alphaToPercent,
  formatColorValue,
  parseColorValue,
  percentToAlpha,
} from "./color-utils.js";

class TimelineCardGeneralSettings extends LitElement {
  static get properties() {
    return {
      config: { type: Object },
    };
  }

  render() {
    if (!this.config) return html``;
    const cfg = this.config;
    const overflowMode = (cfg.overflow || "collapse").toLowerCase();
    const isCollapseMode = overflowMode === "collapse";
    const isScrollMode = overflowMode === "scroll";

    return html`
      <style>${editorStyles}</style>
      <div class="tc-editor-root">
        <!-- SECTION: General -->
        <div class="tc-section">
          <h3 class="tc-section-title">General</h3>
          <div class="tc-section-subtitle">Title, language and refresh.</div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- TITLE -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Title</div>
                  <div class="tc-setting-description">
                    Optional card title.
                  </div>
                </div>
                <ha-textfield
                  style="min-width: 200px; width: 280px; max-width: 280px;"
                  .value=${cfg.title || ""}
                  @input=${(e) => this._onTextChange("title", e.target.value)}
                ></ha-textfield>
              </div>

              <!-- LANGUAGE -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Language</div>
                  <div class="tc-setting-description">
                    Optional override. Empty = auto from HA/browser.
                  </div>
                </div>
                <ha-select
                  style="min-width: 200px; width: 240px;"
                  .value=${cfg.language || ""}
                  @selected=${(e) => this._onSelectChange("language", e)}
                  @closed=${(e) => e.stopPropagation()}
                >
                  <mwc-list-item value="">Auto</mwc-list-item>
                  <mwc-list-item value="de">Deutsch</mwc-list-item>
                  <mwc-list-item value="en-GB">English (UK)</mwc-list-item>
                  <mwc-list-item value="en-US">English (US)</mwc-list-item>
                  <mwc-list-item value="fr">Francais</mwc-list-item>
                  <mwc-list-item value="it">Italiano</mwc-list-item>
                  <mwc-list-item value="pt-br">Portugues (BR)</mwc-list-item>
                  <mwc-list-item value="sv">Svensk</mwc-list-item>
                </ha-select>
              </div>

              <!-- REFRESH INTERVAL -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Refresh interval (s)</div>
                  <div class="tc-setting-description">
                    Optional auto-refresh interval in seconds.
                  </div>
                </div>
                <ha-textfield
                  type="number"
                  min="1"
                  style="width: 140px;"
                  .value=${cfg.refresh_interval ?? ""}
                  @input=${(e) =>
                    this._onNumberChange("refresh_interval", e.target.value)}
                ></ha-textfield>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: Range & data -->
        <div class="tc-section">
          <h3 class="tc-section-title">Range & data</h3>
          <div class="tc-section-subtitle">How much history is loaded.</div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- HOURS -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Hours</div>
                  <div class="tc-setting-description">
                    Number of hours of history to fetch.
                  </div>
                </div>
                <ha-textfield
                  type="number"
                  min="1"
                  style="width: 140px;"
                  .value=${cfg.hours ?? ""}
                  @input=${(e) => this._onNumberChange("hours", e.target.value)}
                ></ha-textfield>
              </div>

              <!-- LIMIT -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Limit</div>
                  <div class="tc-setting-description">
                    Max number of events to display.
                  </div>
                </div>
                <ha-textfield
                  type="number"
                  min="1"
                  style="width: 140px;"
                  .value=${cfg.limit ?? ""}
                  @input=${(e) => this._onNumberChange("limit", e.target.value)}
                ></ha-textfield>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION: Event display -->
        <div class="tc-section">
          <h3 class="tc-section-title">Event display</h3>
          <div class="tc-section-subtitle">
            Collapsing vs. scroll and how many events to show.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <!-- VISIBLE EVENTS (collapse only) -->
              ${isCollapseMode
                ? html`
                    <div class="tc-setting-row">
                      <div class="tc-setting-label">
                        <div class="tc-setting-title">Visible events</div>
                        <div class="tc-setting-description">
                          Show this many before "Show more".
                        </div>
                      </div>
                      <ha-textfield
                        type="number"
                        min="1"
                        style="width: 140px;"
                        .value=${cfg.visible_events ?? ""}
                        @input=${(e) =>
                          this._onNumberChange(
                            "visible_events",
                            e.target.value
                          )}
                      ></ha-textfield>
                    </div>
                  `
                : ""}

              <!-- OVERFLOW MODE -->
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Overflow mode</div>
                  <div class="tc-setting-description">
                    Collapse extra events or render inside a scroll area.
                  </div>
                </div>
                <ha-select
                  style="min-width: 180px; width: 200px;"
                  .value=${cfg.overflow || "collapse"}
                  @selected=${(e) => this._onSelectChange("overflow", e)}
                  @closed=${(e) => e.stopPropagation()}
                >
                  <mwc-list-item value="collapse">Collapse (show more/less)</mwc-list-item>
                  <mwc-list-item value="scroll">Scroll (respect max height)</mwc-list-item>
                </ha-select>
              </div>

              <!-- MAX HEIGHT (scroll only) -->
              ${isScrollMode
                ? html`
                    <div class="tc-setting-row">
                      <div class="tc-setting-label">
                        <div class="tc-setting-title">Max height</div>
                        <div class="tc-setting-description">
                          Limit card height (e.g. 220px or 14rem).
                        </div>
                      </div>
                      <ha-textfield
                        style="width: 180px;"
                        .value=${cfg.max_height ?? ""}
                        @input=${(e) =>
                          this._onTextChange("max_height", e.target.value)}
                      ></ha-textfield>
                    </div>
                  `
                : ""}
            </div>
          </div>
        </div>

        <!-- SECTION: Layout -->
        <div class="tc-section">
          <h3 class="tc-section-title">Layout</h3>
          <div class="tc-section-subtitle">
            Where the timeline line and cards appear.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              <div class="tc-setting-row">
                <div class="tc-setting-label">
                  <div class="tc-setting-title">Card layout</div>
                  <div class="tc-setting-description">
                    Switch between centered (alternating) and single-sided layouts.
                  </div>
                </div>
                <ha-select
                  style="min-width: 200px; width: 240px;"
                  .value=${cfg.card_layout || "center"}
                  @selected=${(e) => this._onSelectChange("card_layout", e)}
                  @closed=${(e) => e.stopPropagation()}
                >
                  <mwc-list-item value="center">Center (alternating)</mwc-list-item>
                  <mwc-list-item value="left">Left line, cards right</mwc-list-item>
                  <mwc-list-item value="right">Right line, cards left</mwc-list-item>
                </ha-select>
              </div>

              ${this._compactRow(cfg)}
            </div>
          </div>
        </div>

        <!-- SECTION: Content -->
        <div class="tc-section">
          <h3 class="tc-section-title">Content</h3>
          <div class="tc-section-subtitle">
            What is shown for each event.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              ${this._booleanRow(
                "Show names",
                "Show the entity name in the timeline.",
                "show_names",
                cfg.show_names ?? true
              )}
              ${this._booleanRow(
                "Show states",
                "Display the entity state next to the name.",
                "show_states",
                cfg.show_states ?? true
              )}
              ${this._booleanRow(
                "Show icons",
                "Add the entity icon to each event.",
                "show_icons",
                cfg.show_icons ?? true
              )}
              ${this._booleanRow(
                "Use relative time",
                "Show relative timestamps like 5 minutes ago.",
                "relative_time",
                cfg.relative_time ?? false
              )}
              ${this._booleanRow(
                "Show date",
                "Include the date for absolute timestamps; turn off to display time only.",
                "show_date",
                cfg.show_date ?? true
              )}
            </div>
          </div>
        </div>

        <!-- SECTION: Text formatting -->
        <div class="tc-section">
          <h3 class="tc-section-title">Text formatting</h3>
          <div class="tc-section-subtitle">
            Control wrapping of names and states.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              ${this._booleanRow(
                "Allow multiline",
                "Allow names and states to wrap across multiple lines.",
                "allow_multiline",
                cfg.allow_multiline ?? false
              )}
              ${this._booleanRow(
                "Force multiline",
                "Always place the state on a new line under the name.",
                "force_multiline",
                cfg.force_multiline ?? false
              )}
            </div>
          </div>
        </div>

        <!-- SECTION: Duplicates -->
        <div class="tc-section">
          <h3 class="tc-section-title">Duplicates & filters</h3>
          <div class="tc-section-subtitle">
            Collapse repeating states globally.
          </div>

          <div class="tc-card-block">
            <div class="tc-form-group">
              ${this._booleanRow(
                "Collapse duplicates",
                "Hide consecutive events with the same state.",
                "collapse_duplicates",
                cfg.collapse_duplicates ?? false
              )}
            </div>
          </div>
        </div>

        <!-- SECTION: Colors -->
        <div class="tc-section">
          <h3 class="tc-section-title">Colors</h3>
          <div class="tc-section-subtitle">
            Optional static colors for name and state (applied globally).
          </div>
          <div class="tc-card-block">
            <div class="tc-form-group">
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  "card_background",
                  cfg.card_background,
                  "Card background color"
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  "timeline_color_start",
                  cfg.timeline_color_start,
                  "Timeline gradient start",
                  "#2da8ff"
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  "timeline_color_end",
                  cfg.timeline_color_end,
                  "Timeline gradient end",
                  "#b24aff"
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  "dot_color",
                  cfg.dot_color,
                  "Dot color",
                  "#31a8ff"
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  "name_color",
                  cfg.name_color,
                  "Name color"
                )}
              </div>
              <div class="tc-color-row">
                ${this._renderColorPicker(
                  "state_color",
                  cfg.state_color,
                  "State color"
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
            ? html`<div class="tc-setting-description">
                ${description}
              </div>`
            : ""}
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
      new CustomEvent("settings-changed", {
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
              this._onColorChange(key, parsed.hex, percentToAlpha(e.target.value))}
          />
          <button
            class="tc-icon-button"
            title="Clear color"
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
        new CustomEvent("settings-changed", {
          detail: { patch },
          bubbles: true,
          composed: true,
        })
      );
      return;
    }

    const parsed = parseColorValue(value);
    const resolvedAlpha =
      typeof alpha === "number" ? alpha : parsed.alpha;
    const formatted = formatColorValue(parsed.hex, resolvedAlpha);
    const patch = { [key]: formatted || undefined };
    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: { patch },
        bubbles: true,
        composed: true,
      })
    );
  }

  _onNumberChange(key, rawValue) {
    const text = `${rawValue ?? ""}`.trim();
    if (!text) {
      this._emitPatch({ [key]: undefined });
      return;
    }
    const num = parseInt(text, 10);
    if (Number.isNaN(num)) return;
    this._emitPatch({ [key]: num });
  }

  _onTextChange(key, value) {
    const v = (value || "").trim();
    this._emitPatch({ [key]: v || undefined });
  }

  _onSelectChange(key, ev) {
    const val = ev.target?.value ?? "";
    const patch = { [key]: val || undefined };

    // If layout switches away from center, turn off compact to avoid invalid combo
    if (key === "card_layout" && val && val !== "center") {
      patch.compact_layout = false;
    }

    this._emitPatch(patch);
  }

  _compactRow(cfg) {
    const layout = cfg.card_layout || "center";
    const disabled = layout !== "center";
    const desc = disabled
      ? "Center layout required."
      : "Overlap rows to reduce the vertical height of the timeline.";
    return this._booleanRow(
      "Compact layout",
      desc,
      "compact_layout",
      cfg.compact_layout ?? false,
      disabled
    );
  }

  _emitPatch(patch) {
    this.dispatchEvent(
      new CustomEvent("settings-changed", {
        detail: { patch },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define(
  "timeline-card-general-settings",
  TimelineCardGeneralSettings
);
