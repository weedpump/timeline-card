# Changelog

## v1.11.2

### Added

- Added a styled browser console banner showing the bundled Timeline Card version

### Fixed

- Fixed `left` and `right` layouts retaining a truncated initial width when opened in dynamically sized containers such as `browser_mod.popup`
- Kept single-sided event tiles responsive across container resizes, initially hidden cards, scrollbars, and view reconnects

### Security

- Updated the transitive development dependency `@humanfs/node` to `0.16.8` to prevent recursive copies from following symlinks outside the source tree
- Updated the transitive development dependency `ajv` to `8.20.0` to address a regular expression denial-of-service vulnerability when using `$data`

### Maintenance

- Synchronized package metadata with `v1.11.2` and added release checks for matching tag, package, lockfile, and changelog versions

No configuration changes are required.

## v1.11.1

### Maintenance

- Updated runtime and development dependencies
- Updated GitHub Actions and release tooling
- Standardized development, CI, and release builds on Node.js 24
- Added automated Dependabot updates
- Improved compatibility with the latest Lit rendering behavior

No configuration changes are required.

## v1.11.0

- Added Dutch translations by **@VGrol**, Thank you!
- Added per-entity `name_color_map` option to set the displayed entity name color based on the raw state
- Fixed missing text fields in the Home Assistant UI editor by replacing internal `ha-textfield` usage with native inputs

## v1.10.0

- Added Polish translations by **@Bagerian**, Thank you!
- Added `collapse_duplicates_keep` option (`earliest` / `latest`) to control which event is kept when collapsing duplicate states — configurable globally and per entity

## v1.9.0

- Added Czech translations by **@trigger737**, Thank you!

## v1.8.1

- Fixed event tile hover highlight not visible in light mode

## v1.8.0

- Added Russian translations by **@kai-zer-ru**, Thank you!
- Editor: migrated language, overflow, and card layout dropdowns to `ha-selector` for compatibility with the new Home Assistant UI by **@kai-zer-ru**
- Editor: fixed entity picker compatibility with updated Home Assistant selector event format by **@kai-zer-ru**
- Editor: fixed language selector not allowing "Auto" to be re-selected after a language was chosen
- Added `min_value` and `max_value` per-entity options to filter events by numeric state (e.g. only show sensor readings ≥ 50 or ≤ 21); non-numeric states are excluded when a value filter is active
- Added default icons for `input_text`, `input_boolean`, `input_number`, `input_select`, `automation`, and `script` domains
- Clicking an event tile now opens the More Info dialog for that entity

## v1.7.0

- **Fixed & Improved `collapse_duplicates`:**
  - Logic updated to track states separately per entity, fixing issues where interleaved events from other entities broke the collapsing.
  - Changed behavior to keep the **earliest** event (start time) of a duplicate sequence instead of the latest.
- Added Italian translations by **@gcosta74**, Thank you!

## v1.6.0

- Fixed: card_mod compatibility and localize empty state message by **@kvanzuijlen**, Thank you!
- Added Swedish translations by **@naitkris**, Thank you!
- Added card option `card_background` to set background color
- Added card options `timeline_color_start`, `timeline_color_end`, `dot_color` to set timeline & dots color
- Added entity option `show_entity_picture` to show the entity picture instead of icon if available
- Added transparency slider to all color pickers

## v1.5.1

- Resolved a CustomElementRegistry conflict with the LLM Vision Card by
  renaming the internal editor element to a unique identifier.
  This prevents the Timeline Card from failing to load when both cards
  are installed.

## v1.5.0

- fixed z-state: the dots of the TimelineCard are no longer displayed above other cards/windows
- Added a card-level `show_date` option (YAML + UI) to hide the date portion and display time only on event tiles.

## v1.4.1

- Left/right layouts now center the timeline line and tiles as a single block.

## v1.4.0

- Added card option `force_multiline` to always place the state below the name.
- Added `card_layout` with `center` (default), `left`, and `right` single-sided timeline layouts using consistent card widths.
- UI editor: reorganized card settings sections and now only show relevant options (visible events for collapse, max height for scroll) with clearer compact layout hint.

## v1.3.1

- Added missing translations for the collapse button.

## v1.3.0

### 🎉 The Card is now fully configurable via the Home Assistant UI editor

### Changes in this release:

- New overflow handling: show only the first N events, collapse the rest behind a toggle or switch to a scrollable container.
- Added compact layout option to reduce vertical spacing.
- Added en-US and en-GB locale files and improved German time suffixes.
- Entity filtering extended with `exclude_states`; states can now show `attributes.unit_of_measurement` suffixes.
- Docs: new browser_mod v2 popup example and refreshed README.

## v1.2.0

- Brazilian Portuguese translations added by **@Bsector**, Thanks!
- Added support for collapsing consecutive duplicate events in history and live updates.

## v1.1.1

- Fix: Add include_states filtering for live WebSocket events
- Fix: Safe-check liveUnsub to avoid errors in HA editor mode
- Fix: Lowercase states when names are displayed

## v1.1.0

- French translations added by **@bsdev90**, Thanks!
- Display the state in the style of the name if `show_names: false` is set
- Added Options `name_color:` and `state_color:` Defineable card wide or per entity.
- Register card in Home Assistant card picker

## v1.0.1

- fixed styling in light mode
- automatic multiline wrapping for long names/states via Card Option `allow_multiline: true/false`
- shortening overly long states

## v1.0.0

### Changes in this release:

- ### Live updates via WebSocket — timeline updates instantly without page refresh:

  The card listens to Home Assistant’s state_changed events via WebSockets.

  Any change of the configured entities is added to the timeline immediately — without refreshing the page.

  **No configuration is required.**

  Live updates work automatically as soon as the card is loaded.

- ### Auto Refresh

  Auto Refresh interval in seconds via YAML option `refresh_interval: 60`

  You can enable an optional background refresh interval.

  The card will periodically re-fetch history data without reloading the UI.

## v0.3.0

- added HACS validation Workflow

## v0.2.0

- Added german and english translations

## v0.1.1

- github actions
