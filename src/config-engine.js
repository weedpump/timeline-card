// ------------------------------------
// CUSTOM CONFIG FETCH
// ------------------------------------
// Returns the per-entity configuration object for a given entity_id,
// or an empty object if none is found.
export function getCustomConfig(entity_id, entities) {
  return entities.find((e) => e.entity === entity_id) || {};
}
