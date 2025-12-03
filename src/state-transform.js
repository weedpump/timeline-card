// state-transform.js
//
// Shared transformer for both:
//  - History events (batch)
//  - Live WebSocket events (single state_changed)
//
// Produces the unified timeline item format.
//

import { getEntityName } from "./name-engine.js";
import { getCustomConfig } from "./config-engine.js";
import { getIconForEntity, getIconColor } from "./icon-engine.js";

export function transformState(entityId, newState, hass, entities, i18n) {
  if (!newState) return null;

  const cfg = getCustomConfig(entityId, entities);
  const rawState = newState.state;

  const name = getEntityName(entityId, entities, hass.states);
  const icon = getIconForEntity(hass.states[entityId], cfg, rawState);
  const icon_color = getIconColor(cfg, rawState);

  const localizedState = i18n.getLocalizedState(
    entityId,
    rawState,
    cfg
  );

  return {
    id: entityId,
    name,
    icon,
    icon_color,
    state: localizedState,
    raw_state: rawState,
    time: new Date(newState.last_changed), // must be Date() for relative_time
  };
}
