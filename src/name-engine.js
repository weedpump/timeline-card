// ------------------------------------
// NAME ENGINE
// ------------------------------------
// Resolve the display name for an entity:
//  1. YAML config name
//  2. HA friendly_name
//  3. raw entity_id
export function getEntityName(entity_id, entities, hassStates) {
  const cfgEntry = entities.find((e) => e.entity === entity_id);
  const liveState = hassStates?.[entity_id];

  return cfgEntry?.name || liveState?.attributes?.friendly_name || entity_id;
}
