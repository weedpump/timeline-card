class TimelineCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Please define 'entities' as a list.");
    }

    // Normalize entities: strings → objects
    this.entities = config.entities.map((e) => {
      if (typeof e === "string") {
        return { entity: e }; // no filters
      }
      return e; // already an object
    });

    this.limit = config.limit;
    this.hours = config.hours;
    this.title = typeof config.title === "string" ? config.title : "";
    this.relativeTimeEnabled = config.relative_time ?? false;
    this.showStates = config.show_states ?? true;

    this.items = [];
    this.loaded = false;
    this.config = config;
  }

  set hass(hass) {
    this.hassInst = hass;

    if (!this.loaded) {
      this.loaded = true;

      // determine language
      const yamlLang = this.config.language;
      const haLang = hass?.locale?.language;
      const browserLang = navigator.language;

      this.language = yamlLang || haLang || browserLang || "en";
      
      // load JSON translations
      this.loadTranslations(this.language).then(() => {
        this.loadHistory();
      });
    }
  }

  // ------------------------------------
  // CUSTOM CONFIG FETCH
  // ------------------------------------
  getCustomConfig(entity_id) {
    return this.entities.find(e => e.entity === entity_id) || {};
  }

  // ------------------------------------
  // ICON COLOR ENGINE (NEW)
  // ------------------------------------
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

    // Default
    return "white";
  }

  // ------------------------------------
  // ICON ENGINE (WITH YAML OVERRIDES)
  // ------------------------------------
  getIconForEntity(stateObj, forcedState) {
    if (!stateObj) return "mdi:help-circle";

    const entity_id = stateObj.entity_id;
    const state     = forcedState ?? stateObj.state;   // <- hier der Trick
    const cfg       = this.getCustomConfig(entity_id);

    // 1) YAML: Icon per state
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

    // 4) HA default icon
    if (stateObj.attributes.icon) return stateObj.attributes.icon;

    // --- ab hier alles wie gehabt, nur überall 'state' verwenden ---
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

    if (dc && DEVICE_CLASS_MAP[dc]) {
      const map = DEVICE_CLASS_MAP[dc];
      return map[state] || map.default || "mdi:help-circle";
    }

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

    const GENERIC_STATES = {
      on: "mdi:check-circle",
      off: "mdi:circle-outline",
      open: "mdi:arrow-up",
      closed: "mdi:arrow-down",
      unknown: "mdi:help-circle-outline",
    };

    if (GENERIC_STATES[state]) return GENERIC_STATES[state];

    return "mdi:help-circle";
  }

  // ------------------------------------
  // NAME ENGINE
  // ------------------------------------
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
  async loadTranslations(lang) {
    const short = lang.toLowerCase().substring(0, 2);
    this.languageCode = short;

    const path = `/local/timeline-card/locales/${short}.json`;
    const fallbackPath = `/local/timeline-card/locales/en.json`;

    try {
      const res = await fetch(path);
      if (res.ok) {
        this.translations = await res.json();
        return;
      }
    } catch(e) {
      console.warn("TimelineCard: Failed loading locale:", path);
    }

    // fallback → English
    const res2 = await fetch(fallbackPath);
    this.translations = await res2.json();
  }

  // helper to access translations
  t(path, vars = {}) {
    const parts = path.split(".");
    let node = this.translations;

    for (const p of parts) {
      if (!node[p]) return path;
      node = node[p];
    }

    // string interpolation {n}
    if (typeof node === "string") {
      return node.replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? `{${v}}`);
    }

    return node;
  }

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
  relativeTime(date) {
    const diff = (Date.now() - date.getTime()) / 1000;

    if (diff < 60) return this.t("time.seconds");
    if (diff < 3600) return this.t("time.minutes", { n: Math.floor(diff / 60) });
    if (diff < 86400) return this.t("time.hours", { n: Math.floor(diff / 3600) });
    return this.t("time.days", { n: Math.floor(diff / 86400) });
  }
 
  formatAbsoluteTime(date) {
    const fmt = this.t("date_format.datetime");
    return date.toLocaleString(this.languageCode, fmt);
  }
 
  // ------------------------------------
  // LOAD HISTORY
  // ------------------------------------
  async loadHistory() {
    const end = new Date();
    const start = new Date(end.getTime() - this.hours * 60 * 60 * 1000);

    const startTime = start.toISOString();
    const endTime   = end.toISOString();

    const entityParam = this.entities.map((e) => e.entity).join(",");

    const data = await this.hassInst.callApi(
      "GET",
      `history/period/${startTime}?filter_entity_id=${entityParam}&end_time=${endTime}`
    );

    let flat = [];

    data.forEach((entityList) => {
      entityList.forEach((entry) => {
        const st        = this.hassInst.states[entry.entity_id];   // aktueller Live-State (für device_class etc.)
        const rawState  = entry.state;                             // Rohzustand aus der History
        const name      = this.getEntityName(entry.entity_id);
        const icon      = this.getIconForEntity(st, rawState);     // Icon anhand des Rohzustands
        const color     = this.getIconColor(entry.entity_id, rawState);
        const niceState = this.getLocalizedState(entry.entity_id, rawState); // Übersetzung / YAML-Override

        flat.push({
          id: entry.entity_id,
          name: name,
          icon: icon,
          icon_color: color,
          state: niceState,          // 🔹 das ist der angezeigte, lokalisierte Wert
          raw_state: rawState,       // 🔹 das ist der technische Wert für Filter & Icons
          time: new Date(entry.last_changed),
        });
      });
    });


    // Remove HA fake start event
    flat = flat.filter((e) => e.time.getTime() !== start.getTime());

    // Filter include_states
    flat = flat.filter((ev) => {
      const cfg = this.entities.find((e) => e.entity === ev.id);
      const include = cfg?.include_states;

      if (!include || !Array.isArray(include)) return true;
      return include.includes(ev.raw_state);   // 🔹 wichtig: Rohzustand prüfen
    });

    // Sort + Limit
    this.items = flat.sort((a, b) => b.time - a.time).slice(0, this.limit);

    this.render();
  }

  // ------------------------------------
  // RENDER CARD
  // ------------------------------------
  render() {
    const root = this.shadowRoot || this.attachShadow({ mode: "open" });

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

  getCardSize() {
    return this.limit || 3;
  }
}

customElements.define("timeline-card", TimelineCard);
