import en from "./locales/en.json";
import de from "./locales/de.json";
import styles from "./timeline-card.css";

import { TranslationEngine } from "./translation-engine.js";
import { getIconForEntity, getIconColor } from "./icon-engine.js";

const translations = { en, de };

class TimelineCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Please define 'entities' as a list.");
    }

    // Normalize entities: strings → objects
    // Allows using either:
    //  - "sensor.door"
    //  - { entity: "sensor.door", name: "...", ... }
    this.entities = config.entities.map((e) => {
      if (typeof e === "string") {
        return { entity: e };
      }
      return e;
    });

    // Maximum number of events to display
    this.limit = config.limit;

    // Time range (in hours) to request from HA history API
    this.hours = config.hours;

    // Optional card title
    this.title = typeof config.title === "string" ? config.title : "";

    // Use localized relative time ("x minutes ago") instead of absolute timestamp
    this.relativeTimeEnabled = config.relative_time ?? false;

    // Show or hide the state text after the entity name
    this.showStates = config.show_states ?? true;

    // Internal state
    this.items = [];
    this.loaded = false;
    this.config = config;
  }

  set hass(hass) {
    this.hassInst = hass;

    // Only run initialization once
    if (!this.loaded) {
      this.loaded = true;

      // Determine language:
      // 1) Explicit language in YAML config
      // 2) HA UI language
      // 3) Browser language
      // 4) Fallback → "en"
      const yamlLang = this.config.language;
      const haLang = hass?.locale?.language;
      const browserLang = navigator.language;

      this.language = yamlLang || haLang || browserLang || "en";

      // Load JSON translation file and then fetch history data
      this.i18n = new TranslationEngine(translations);

      this.i18n.load(this.language).then(() => {
        this.languageCode = this.language.toLowerCase().substring(0, 2);
        this.loadHistory();
      });
    }
  }

  // ------------------------------------
  // CUSTOM CONFIG FETCH
  // ------------------------------------
  // Returns the per-entity configuration object for a given entity_id,
  // or an empty object if none is found.
  getCustomConfig(entity_id) {
    return this.entities.find(e => e.entity === entity_id) || {};
  }

  // ------------------------------------
  // NAME ENGINE
  // ------------------------------------
  // Resolve the display name for an entity:
  //  1. YAML config name
  //  2. HA friendly_name
  //  3. raw entity_id
  getEntityName(entity_id) {
    const cfgEntry  = this.entities.find(e => e.entity === entity_id);
    const liveState = this.hassInst?.states?.[entity_id];

    return (
      cfgEntry?.name ||
      liveState?.attributes?.friendly_name ||
      entity_id
    );
  }

  // ------------------------------------
  // RELATIVE TIME
  // ------------------------------------
  // Creates a localized relative timestamp like:
  //  - "a few seconds ago"
  //  - "5 minutes ago"
  // Uses the "time.*" keys from the locale JSON.
  relativeTime(date) {
    const diff = (Date.now() - date.getTime()) / 1000;

    if (diff < 60) return this.i18n.t("time.seconds");
    if (diff < 3600) return this.i18n.t("time.minutes", { n: Math.floor(diff / 60) });
    if (diff < 86400) return this.i18n.t("time.hours", { n: Math.floor(diff / 3600) });
    return this.i18n.t("time.days", { n: Math.floor(diff / 86400) });
  }

  // Formats an absolute timestamp using the locale's "date_format.datetime"
  // structure and the browser's Intl date formatting.
  formatAbsoluteTime(date) {
    const fmt = this.i18n.t("date_format.datetime");
    return date.toLocaleString(this.languageCode, fmt);
  }

  // ------------------------------------
  // LOAD HISTORY
  // ------------------------------------
  // Fetches entity history from Home Assistant:
  //  - Time range based on this.hours
  //  - Filters by configured entities
  //  - Flattens history into a simple timeline array
  //  - Applies state localization, icon mapping, and filters
  async loadHistory() {
    const end = new Date();
    const start = new Date(end.getTime() - this.hours * 60 * 60 * 1000);

    const startTime = start.toISOString();
    const endTime   = end.toISOString();

    // Comma separated list of entities for the API filter
    const entityParam = this.entities.map((e) => e.entity).join(",");

    const data = await this.hassInst.callApi(
      "GET",
      `history/period/${startTime}?filter_entity_id=${entityParam}&end_time=${endTime}`
    );

    let flat = [];

    data.forEach((entityList) => {
      entityList.forEach((entry) => {
        const st        = this.hassInst.states[entry.entity_id];   // current live state (for device_class etc.)
        const rawState  = entry.state;                             // raw state from history
        const name      = this.getEntityName(entry.entity_id);
        
        const cfg = this.getCustomConfig(entry.entity_id);

        const icon      = getIconForEntity(st, cfg, rawState);    // icon based on raw historical state
        const color     = getIconColor(cfg, rawState);

        const niceState = this.i18n.getLocalizedState(entry.entity_id, rawState, cfg); // translated / YAML-override label

        flat.push({
          id: entry.entity_id,
          name: name,
          icon: icon,
          icon_color: color,
          state: niceState,          // human readable (localized) label
          raw_state: rawState,       // technical state used for filters and icon mapping
          time: new Date(entry.last_changed),
        });
      });
    });

    // Remove HA's synthetic "range start" event which matches the start timestamp
    flat = flat.filter((e) => e.time.getTime() !== start.getTime());

    // Filter by include_states per entity if configured.
    // This uses the raw_state so it stays independent of translations.
    flat = flat.filter((ev) => {
      const cfg = this.entities.find((e) => e.entity === ev.id);
      const include = cfg?.include_states;

      if (!include || !Array.isArray(include)) return true;
      return include.includes(ev.raw_state);
    });

    // Sort by time (newest first) and apply global limit
    this.items = flat.sort((a, b) => b.time - a.time).slice(0, this.limit);

    this.render();
  }

  // ------------------------------------
  // RENDER CARD
  // ------------------------------------
  // Renders the timeline with alternating left/right event boxes,
  // a central vertical gradient line and a glowing dot per row.
  render() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });

    // Empty state: no items in selected time range
    if (!this.items.length) {
      root.innerHTML = `
        <style>${styles}</style>
        <ha-card>
          <div style="padding:12px">Keine Ereignisse in diesem Zeitraum.</div>
        </ha-card>
      `;
      return;
    }

    const rows = this.items
      .map((item, index) => {
        const side = index % 2 === 0 ? "left" : "right";

        return `
          <div class="timeline-row">
            <div class="side left">
              ${
                side === "left"
                  ? `
                  <div class="event-box">
                    <ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>
                    <div class="text">
                      <div class="row">
                        <div class="title">${item.name}</div>
                        ${ this.showStates 
                            ? `<div class="state">(${item.state})</div>` 
                            : `` 
                        }
                      </div>
                      <div class="time">
                        ${ this.relativeTimeEnabled 
                            ? this.relativeTime(item.time) 
                            : this.formatAbsoluteTime(item.time)
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
                  <div class="event-box">
                    <ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>
                    <div class="text">
                      <div class="row">
                        <div class="title">${item.name}</div>
                        ${ this.showStates 
                            ? `<div class="state">(${item.state})</div>` 
                            : `` 
                        }
                      </div>
                      <div class="time">
                        ${ this.relativeTimeEnabled 
                            ? this.relativeTime(item.time) 
                            : this.formatAbsoluteTime(item.time)
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

    root.innerHTML = `
      <style>${styles}</style>

      <ha-card>
        ${this.title ? `<h1 class="card-title">${this.title}</h1>` : ""}
        <div class="wrapper">
          <div class="timeline-line"></div>
          ${rows}
        </div>
      </ha-card>
    `;
  }

  // Home Assistant uses this to estimate the card height
  getCardSize() {
    return this.limit || 3;
  }
}

customElements.define("timeline-card", TimelineCard);
