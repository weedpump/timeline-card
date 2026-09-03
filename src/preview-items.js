import { filterHistory } from './history-filter.js';
import { transformState } from './state-transform.js';

export function createCurrentStatePreview(hass, entities, i18n, limit, config) {
  const items = entities
    .map(({ entity }) =>
      transformState(entity, hass.states[entity], hass, entities, i18n)
    )
    .filter(Boolean);

  return filterHistory(items, entities, limit, config);
}
