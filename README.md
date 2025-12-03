<!--BADGES-->
[hacs-default]: https://img.shields.io/badge/HACS-Default-blue?style=flat&logo=homeassistantcommunitystore&logoSize=auto
[hacs-default-link]: https://my.home-assistant.io/redirect/hacs_repository/?owner=weedpump&repository=timeline-card&category=plugin
[hacs-validate]: https://github.com/ngocjohn/lunar-phase-card/actions/workflows/validate.yaml/badge.svg
[hacs-validate-link]: https://github.com/weedpump/timeline-card/actions/workflows/validate.yaml

# Timeline Card
[![hacs][hacs-default]][hacs-default-link] [![hacs][hacs-validate]][hacs-validate-link]

<p align="center">
  <img 
    src="https://raw.githubusercontent.com/weedpump/timeline-card/main/docs/logo.png"
    alt="Timeline Card Logo"
    width="140"
    style="margin-bottom: 12px;"
  />
</p>

<p align="center">
  <strong>Timeline Card for Home Assistant</strong><br>
  <em>Real-time event history with WebSocket updates & beautiful timeline UI</em>
</p>

<p align="center">
  <img 
    src="https://raw.githubusercontent.com/weedpump/timeline-card/main/docs/card-preview.png"
    alt="Timeline Card Screenshot"
    style="border-radius:12px; box-shadow:0 4px 22px rgba(0,0,0,0.15);"
  />
</p>

---

## Table of Contents
1. [Features](#-features)
2. [Installation](#-installation)
   1. [HACS (Custom Repository)](#hacs-custom-repository---recommended)
   2. [Manual Installation](#manual-installation)
3. [Configuration](#-configuration)
   1. [Basic Example](#basic-example)
   2. [Card Options](#card-options)
   3. [Auto-Refresh](#auto-refresh)
   4. [Live Events (WebSocket)](#live-events-websocket)
4. [Per-Entity Configuration](#-per-entity-configuration)
   1. [Example](#example)
   2. [Entity Options](#entity-options)
5. [Examples](#-examples)
   1. [Presence Timeline](#presence-timeline)
   2. [Door Monitoring](#door-monitoring)
6. [Locales](#-locales)   
7. [License](#-license)

---

## ✨ Features

* Alternating left/right timeline layout with a central gradient line
* Configurable history range (in hours)
* Global limit for the number of events shown
* Per-entity configuration (name, icons, colors, status labels, filters)
* Localized **relative time** (e.g. "5 minutes ago") or **absolute datetime**
* Locale-based state translation with per-entity overrides
* Optional **auto-refresh** interval (in seconds)
* **Live updates via WebSocket** — timeline updates instantly without page refresh
* Works with any entity that appears in Home Assistant history

---

## 📦 Installation

### HACS (Recommended)
<details>
  <summary>click to show installation instructions</summary>
<BR>The Repository is part of the official HACS store.

To install it, click this link:

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=weedpump&repository=timeline-card&category=plugin)

Or:
<BR>Open the HACS panel in HA, search for timeline-card, and click download.
Follow the instructions provided to complete the installation.
</details>

### Manual Installation
<details>
  <summary>click to show installation instructions</summary>
<BR>

1. Download `timeline-card.js` from the latest GitHub release.

2. Place the file in your Home Assistant `www` directory:

```
/config/www/timeline-card/timeline-card.js
```

3. Add the resource to your dashboard configuration:

```yaml
resources:
  - url: /local/timeline-card/timeline-card.js
    type: module
```

Or via the UI:
**Settings → Dashboards → ⋮ → Resources → Add resource**
</details>

---

## ⚙️ Configuration

### Basic Example

```yaml
type: custom:timeline-card
title: Door & Presence
hours: 12
limit: 8
relative_time: true
show_states: true
entities:
  - entity: binary_sensor.frontdoor_contact
  - entity: person.tobi
```

### Card Options

| Option             | Type    | Required | Default | Description                               |
| ------------------ | ------- | -------- | ------- | ----------------------------------------- |
| `entities`         | list    | yes      | —       | List of entities or entity config objects |
| `hours`            | number  | yes      | —       | Number of hours of history to fetch       |
| `limit`            | number  | yes      | —       | Max number of events displayed            |
| `title`            | string  | no       | ""      | Card title                                |
| `relative_time`    | boolean | no       | false   | Use relative ("5 minutes ago") time       |
| `show_names`       | boolean | no       | true    | Show entity names                         |
| `show_states`      | boolean | no       | true    | Show entity states                        |
| `show_icons`       | boolean | no       | true    | Show entity icons                         |
| `language`         | string  | no       | auto    | Language code (`en`, `de`, …)             |
| `refresh_interval` | number  | no       | —       | Auto-refresh interval in seconds (background refresh) |

### Auto-Refresh

You can enable an optional background refresh interval.  
The card will periodically re-fetch history data without reloading the UI.

```yaml
type: custom:timeline-card
hours: 6
limit: 8
refresh_interval: 30   # refresh every 30 seconds
entities:
  - entity: sensor.energy_usage
```

The refresh runs silently in the background and only updates the timeline if new events appear.

### Live Events (WebSocket)

The card listens to Home Assistant’s `state_changed` events via WebSockets.  
Any change of the configured entities is added to the timeline immediately — without refreshing the page.

**No configuration is required.**  
Live updates work automatically as soon as the card is loaded.

Features:
* Real-time updates for all configured entities  
* Same formatting as history events (icons, colors, labels, localization)  
* No full dashboard reload — only the timeline content is updated

---

## 🧩 Per-Entity Configuration

### Example

```yaml
entities:
  - entity: binary_sensor.frontdoor_contact
    name: Front Door
    icon: mdi:door
    icon_color: "#ffcc00"
    icon_color_map:
      on: "#ff4444"
      off: "#44ff44"
    icon_map:
      on: mdi:door-open
      off: mdi:door-closed
      default: mdi:door
    status_map:
      on: "opened"
      off: "closed"
    include_states:
      - on
      - off
```

### Entity Options

| Option           | Type   | Description                                  |
| ---------------- | ------ | -------------------------------------------- |
| `name`           | string | Display name override                        |
| `icon`           | string | Static icon                                  |
| `icon_map`       | object | State → icon mapping                         |
| `icon_color`     | string | Static color                                 |
| `icon_color_map` | object | State → color mapping                        |
| `status_map`     | object | State → label override                       |
| `include_states` | list   | Only include events with matching raw states |

---

## 📘 Examples

### Presence Timeline

```yaml
type: custom:timeline-card
title: Presence Timeline
hours: 24
limit: 10
relative_time: true
entities:
  - entity: person.tobi
    icon_map:
      home: mdi:home
      not_home: mdi:account-arrow-right
    status_map:
      home: "at home"
      not_home: "away"
```

### Door Monitoring

```yaml
type: custom:timeline-card
title: Doors & Windows
hours: 6
limit: 12
show_states: true
entities:
  - entity: binary_sensor.frontdoor_contact
  - entity: binary_sensor.window_livingroom
```

---

## 🌐 Locales

The card uses JSON-based localization.
Language selection order:

1. `language:` option in YAML
2. Home Assistant UI language
3. Browser language
4. Fallback → English

---

## 📄 License

MIT License  
Free to use, free to modify.

