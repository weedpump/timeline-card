<!--BADGES-->
[hacs-default]: https://img.shields.io/badge/HACS-Default-blue?style=flat&logo=homeassistantcommunitystore&logoSize=auto
[hacs-default-link]: https://my.home-assistant.io/redirect/hacs_repository/?owner=weedpump&repository=timeline-card&category=plugin
[hacs-validate]: https://github.com/ngocjohn/lunar-phase-card/actions/workflows/validate.yaml/badge.svg
[hacs-validate-link]: https://github.com/weedpump/timeline-card/actions/workflows/validate.yaml

# Timeline Card
[![hacs][hacs-default]][hacs-default-link] [![hacs][hacs-validate]][hacs-validate-link]

**A custom Lovelace card for Home Assistant that renders a vertical,
alternating timeline of recent events for one or more entities.
Supports per-entity configuration, localized time and state labels, icon
mapping, and flexible filtering.**

<p align="center">
  <img src="https://raw.githubusercontent.com/weedpump/timeline-card/main/docs/card-preview.png" alt="HA Timeline Card">
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
* Per-entity configuration (name, icons, colors, status labels,
  filters)
* Localized **relative time** (e.g. "5 minutes ago") or **absolute
  datetime**
* Locale-based state translation with per-entity overrides
* Works with any entity that appears in Home Assistant history

---

## 📦 Installation

### HACS (Custom Repository - Recommended)
<details>
  <summary></summary>
The Timeline Card can be installed and updated through HACS.

Since the repository is not yet part of the official HACS store, you need to add it as a custom repository:

**HACS → Integrations → ⋮ (Menu) → Custom repositories**

**URL:**
`https://github.com/weedpump/timeline-card`

**Category:**
`Dashboard`

After adding it, the card can be installed and updated normally via HACS.
</details>

### Manual Installation
<details>
  <summary></summary>
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

| Option          | Type    | Required | Default | Description                               |
| --------------- | ------- | -------- | ------- | ----------------------------------------- |
| `entities`      | list    | yes      | —       | List of entities or entity config objects |
| `hours`         | number  | yes      | —       | Number of hours of history to fetch       |
| `limit`         | number  | yes      | —       | Max number of events displayed            |
| `title`         | string  | no       | ""      | Card title                                |
| `relative_time` | boolean | no       | false   | Use relative ("5 minutes ago") time       |
| `show_states`   | boolean | no       | true    | Show state next to entity name            |
| `language`      | string  | no       | auto    | Language code (`en`, `de`, …)             |

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

