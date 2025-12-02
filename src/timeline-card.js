import en from "./locales/en.json";
import de from "./locales/de.json";

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
      this.loadTranslations(this.language).then(() => {
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
  // ICON COLOR ENGINE
  // ------------------------------------
  // Resolve the icon color for a given entity_id and state.
  // Priority:
  //  1. icon_color_map[state]
  //  2. icon_color (static)
  //  3. fallback → "white"
  getIconColor(entity_id, state) {
    const cfg = this.getCustomConfig(entity_id);

    // Per-state color
    if (cfg.icon_color_map && cfg.icon_color_map[state]) {
      return cfg.icon_color_map[state];
    }

    // Static color
    if (cfg.icon_color) {
      return cfg.icon_color;
    }

    // Default color
    return "white";
  }

  // ------------------------------------
  // ICON ENGINE (WITH YAML OVERRIDES)
  // ------------------------------------
  // Calculates the icon for an entity, with support for:
  //  - YAML icon_map per state
  //  - YAML static icon
  //  - YAML icon_map.default fallback
  //  - HA native icon
  //  - Device class based icon mapping
  //  - Domain based icon mapping
  //  - Generic fallback icons per state
  //
  // forcedState allows us to base the icon on the historical state
  // instead of the current live state.
  getIconForEntity(stateObj, forcedState) {
    if (!stateObj) return "mdi:help-circle";

    const entity_id = stateObj.entity_id;
    const state     = forcedState ?? stateObj.state;   // use historical state if provided
    const cfg       = this.getCustomConfig(entity_id);

    // 1) YAML: icon per state
    if (cfg.icon_map && cfg.icon_map[state]) {
      return cfg.icon_map[state];
    }

    // 2) YAML: static icon
    if (cfg.icon) {
      return cfg.icon;
    }

    // 3) YAML: icon_map default fallback
    if (cfg.icon_map && cfg.icon_map["default"]) {
      return cfg.icon_map["default"];
    }

    // 4) Native HA icon
    if (stateObj.attributes.icon) return stateObj.attributes.icon;

    // Below: heuristic icon selection using device_class and domain
    const domain = entity_id.split(".")[0];
    const dc = stateObj.attributes.device_class;

    const DEVICE_CLASS_MAP = {
      lock:       { locked: "mdi:lock", unlocked: "mdi:lock-open-variant" },
      door:       { open: "mdi:door-open", closed: "mdi:door-closed" },
      window:     { open: "mdi:window-open", closed: "mdi:window-closed" },
      motion:     { on: "mdi:run", off: "mdi:walk" },
      presence:   { on: "mdi:account", off: "mdi:account-off" },
      occupancy:  { on: "mdi:home-account", off: "mdi:home-outline" },
      battery:    { default: "mdi:battery" },
      temperature:{ default: "mdi:thermometer" },
      humidity:   { default: "mdi:water-percent" },
      garage_door:{ open: "mdi:garage-open", closed: "mdi:garage" },
    };

    // Device class specific icon mapping
    if (dc && DEVICE_CLASS_MAP[dc]) {
      const map = DEVICE_CLASS_MAP[dc];
      return map[state] || map.default || "mdi:help-circle";
    }

    // Domain based defaults
    const DOMAIN_MAP = {
      lock: state === "locked" ? "mdi:lock" : "mdi:lock-open-variant",
      binary_sensor: state === "on" ? "mdi:eye" : "mdi:eye-off",
      sensor: "mdi:information-outline",
      vacuum: "mdi:robot-vacuum",
      person: state === "home" ? "mdi:home" : "mdi:account-arrow-right",
      light: state === "on" ? "mdi:lightbulb-on" : "mdi:lightbulb",
      switch: state === "on" ? "mdi:toggle-switch" : "mdi:toggle-switch-off",
    };

    if (DOMAIN_MAP[domain]) return DOMAIN_MAP[domain];

    // Generic fallback icons for common states
    const GENERIC_STATES = {
      on: "mdi:check-circle",
      off: "mdi:circle-outline",
      open: "mdi:arrow-up",
      closed: "mdi:arrow-down",
      unknown: "mdi:help-circle-outline",
    };

    if (GENERIC_STATES[state]) return GENERIC_STATES[state];

    // Final fallback
    return "mdi:help-circle";
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
  // I18N SYSTEM
  // ------------------------------------
  // Load translation JSON based on language:
  //  - languageCode: first 2 letters (e.g. "en", "de")
  //  - path: /local/timeline-card/locales/{languageCode}.json
  //  - fallback: English
  async loadTranslations(lang) {
    const short = lang.toLowerCase().substring(0, 2);
    this.languageCode = short;

    this.translations = translations[short] || translations.en;
  }

  // Helper to access nested translation values, e.g. t("time.minutes")
  // Supports simple token replacement: "Text {n}" → { n: 5 }
  t(path, vars = {}) {
    const parts = path.split(".");
    let node = this.translations;

    for (const p of parts) {
      if (!node[p]) return path; // return key if not found
      node = node[p];
    }

    // String interpolation {var}
    if (typeof node === "string") {
      return node.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
    }

    return node;
  }

  // Returns a localized representation of the state:
  // 1. YAML status_map override
  // 2. JSON locale translations (status.*)
  // 3. Fallback → raw state string
  getLocalizedState(entity_id, state) {
    const cfg = this.getCustomConfig(entity_id);

    // 1) YAML override
    if (cfg.status_map && cfg.status_map[state]) {
      return cfg.status_map[state];
    }

    // 2) JSON locale translations
    const translated = this.t(`status.${state}`);
    if (translated !== `status.${state}`) {
      return translated;
    }

    // 3) fallback → original state
    return state;
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

    if (diff < 60) return this.t("time.seconds");
    if (diff < 3600) return this.t("time.minutes", { n: Math.floor(diff / 60) });
    if (diff < 86400) return this.t("time.hours", { n: Math.floor(diff / 3600) });
    return this.t("time.days", { n: Math.floor(diff / 86400) });
  }

  // Formats an absolute timestamp using the locale's "date_format.datetime"
  // structure and the browser's Intl date formatting.
  formatAbsoluteTime(date) {
    const fmt = this.t("date_format.datetime");
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
        const icon      = this.getIconForEntity(st, rawState);     // icon based on raw historical state
        const color     = this.getIconColor(entry.entity_id, rawState);
        const niceState = this.getLocalizedState(entry.entity_id, rawState); // translated / YAML-override label

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
      <style>
        :host {
          display: block;
        }

        ha-card {
          padding: 10px 16px;
          position: relative;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          padding-left: 4px;
          color: white;
        }

        .wrapper {
          position: relative;
          width: 100%;
        }

        .timeline-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 3px;
          transform: translateX(-50%);
          background: linear-gradient(#2da8ff, #b24aff);
          opacity: 0.9;
          border-radius: 3px;
        }

        .timeline-row {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          margin: 16px 0;
        }

        .side {
          width: 47%;
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .side.left {
          justify-content: flex-end;
          padding-right: 45px;
        }

        .side.right {
          justify-content: flex-start;
          padding-left: 45px;
        }

        .event-box {
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(4px);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          box-shadow: 0 0 12px rgba(0,0,0,0.25);

          width: auto;
          max-width: 100%;
          flex-shrink: 1;
          min-width: 0;
        }

        ha-icon {
          width: 22px;
          height: 22px;
        }

        .text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .row {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }

        .title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 1;
          min-width: 0;
          font-weight: 600;
          font-size: 13px;
          color: white;
        }

        .state {
          white-space: nowrap;
          flex-shrink: 0;
          opacity: 0.6;
          font-size: 11px;
        }

        .time {
          font-size: 11px;
          opacity: 0.75;
          color: white;
        }

        .dot {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #31a8ff;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0,150,255,0.8);
          z-index: 10;
        }
      </style>

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
