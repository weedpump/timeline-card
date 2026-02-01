import { transformState } from './state-transform.js';

/**
 * Transform HA history API result into a unified flat list
 * of timeline entries.
 */
export function transformHistory(historyData, entities, hassStates, i18n) {
  const { data, start } = historyData;

  let flat = [];

  data.forEach((entityList) => {
    entityList.forEach((entry) => {
      // Use unified transform for both history and live events
      const item = transformState(
        entry.entity_id,
        entry, // entry itself is a state object
        { states: hassStates },
        entities,
        i18n
      );

      if (item) {
        flat.push(item);
      }
    });
  });

  // Remove synthetic "range start"
  return flat.filter((e) => e.time.getTime() !== start.getTime());
}
