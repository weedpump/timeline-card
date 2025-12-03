import en from "./locales/en.json";
import de from "./locales/de.json";
import styles from "./timeline-card.css";

import { TranslationEngine } from "./translation-engine.js";
import { relativeTime, formatAbsoluteTime } from "./time-engine.js";

import { fetchHistory } from "./history-fetch.js";
import { transformHistory } from "./history-transform.js";
import { filterHistory } from "./history-filter.js";

import { getCachedHistory, setCachedHistory } from "./history-cache.js";

// Unified state transformer for both history + live
import { transformState } from "./state-transform.js";

const translations = { en, de };

class TimelineCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || !Array.isArray(config.entities)) {
      throw new Error("Please define 'entities' as a list.");
    }

    this.entities = config.entities.map((e) =>
      typeof e === "string" ? { entity: e } : e
    );

    this.limit = config.limit;
    this.hours = config.hours;
    this.title = typeof config.title === "string" ? config.title : "";

    this.relativeTimeEnabled = config.relative_time ?? false;
    this.showStates = config.show_states ?? true;
    this.showNames = config.show_names ?? true;
    this.showIcons = config.show_icons ?? true;

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

      this.language = yamlLang || haLang || browserLang || "en";

      this.i18n = new TranslationEngine(translations);

      this.i18n.load(this.language).then(() => {
        this.languageCode = this.language.toLowerCase().substring(0, 2);
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
    const raw = await fetchHistory(
      this.hassInst,
      this.entities,
      this.hours
    );

    const flat = transformHistory(
      raw,
      this.entities,
      this.hassInst.states,
      this.i18n
    );

    const items = filterHistory(flat, this.entities, this.limit);

    setCachedHistory(
      this.entities,
      this.hours,
      this.languageCode,
      items
    );

    this.items = items;
    this.render();
  }

  async refreshInBackground() {
    const raw = await fetchHistory(
      this.hassInst,
      this.entities,
      this.hours
    );

    const flat = transformHistory(
      raw,
      this.entities,
      this.hassInst.states,
      this.i18n
    );

    const items = filterHistory(flat, this.entities, this.limit);

    if (JSON.stringify(items) === JSON.stringify(this.items)) return;

    setCachedHistory(
      this.entities,
      this.hours,
      this.languageCode,
      items
    );

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

    this.liveUnsub = this.hassInst.connection.subscribeEvents(
      (msg) => {
        const data = msg?.data;
        if (!data?.entity_id) return;
        if (!entityIds.includes(data.entity_id)) return;

        this.processLiveEvent(data);
      },
      "state_changed"
    );

    console.warn("TimelineCard WebSocket subscription active.");
  }

  processLiveEvent(data) {
    const entityId = data.entity_id;
    const newState = data.new_state;

    const item = transformState(
      entityId,
      newState,
      this.hassInst,
      this.entities,
      this.i18n
    );

    if (!item) return;

    this.items.unshift(item);

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
    if (this.liveUnsub) {
      this.liveUnsub();
      this.liveUnsub = null;
    }
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
                    ${
                      this.showIcons
                        ? `<ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>`
                        : ``
                    }
                    <div class="text">
                      <div class="row">
                        ${
                          this.showNames
                            ? `<div class="name">${item.name}</div>`
                            : ``
                        }
                        ${
                          this.showStates
                            ? `<div class="state">(${item.state})</div>`
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
                  <div class="event-box">
                    ${
                      this.showIcons
                        ? `<ha-icon icon="${item.icon}" style="color:${item.icon_color};"></ha-icon>`
                        : ``
                    }
                    <div class="text">
                      <div class="row">
                        ${
                          this.showNames
                            ? `<div class="name">${item.name}</div>`
                            : ``
                        }
                        ${
                          this.showStates
                            ? `<div class="state">(${item.state})</div>`
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
                                this.i18n)
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

  getCardSize() {
    return this.limit || 3;
  }
}

customElements.define("timeline-card", TimelineCard);
