# Changelog

## v1.7.0

- **Fixed & Improved `collapse_duplicates`:**
  - Logic updated to track states separately per entity, fixing issues where interleaved events from other entities broke the collapsing.
  - Changed behavior to keep the **earliest** event (start time) of a duplicate sequence instead of the latest.
- Added automated testing workflow and integrated it into the release process.
- Added Italian translations by **gcosta74**, Thank you!

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
