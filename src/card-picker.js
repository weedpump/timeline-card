const TIMELINE_SUGGESTION_DOMAINS = new Set([
  'alarm_control_panel',
  'automation',
  'binary_sensor',
  'calendar',
  'climate',
  'cover',
  'device_tracker',
  'event',
  'fan',
  'humidifier',
  'input_boolean',
  'lawn_mower',
  'light',
  'lock',
  'media_player',
  'person',
  'remote',
  'schedule',
  'sensor',
  'siren',
  'sun',
  'switch',
  'timer',
  'update',
  'vacuum',
  'valve',
  'water_heater',
  'weather',
]);

export function createTimelineConfig(entityIds, { includeType = false } = {}) {
  return {
    ...(includeType ? { type: 'custom:timeline-card' } : {}),
    title: 'Timeline',
    hours: 6,
    limit: 10,
    relative_time: true,
    show_names: true,
    show_states: true,
    show_icons: true,
    entities: entityIds.map((entity) => ({ entity })),
  };
}

export function isTimelineEntitySupported(hass, entityId) {
  if (!hass?.states || typeof entityId !== 'string') return false;

  const separatorIndex = entityId.indexOf('.');
  if (
    separatorIndex <= 0 ||
    separatorIndex === entityId.length - 1 ||
    entityId.indexOf('.', separatorIndex + 1) !== -1
  ) {
    return false;
  }

  const domain = entityId.slice(0, separatorIndex);
  return (
    Object.hasOwn(hass.states, entityId) &&
    TIMELINE_SUGGESTION_DOMAINS.has(domain)
  );
}

export function createEntitySuggestion(hass, entityId) {
  if (!isTimelineEntitySupported(hass, entityId)) return null;

  return {
    config: createTimelineConfig([entityId], { includeType: true }),
  };
}

export function selectPreviewEntities(
  hass,
  entities = [],
  entitiesFallback = [],
  maxEntities = 3
) {
  const candidates = [
    ...(Array.isArray(entities) ? entities : []),
    ...(Array.isArray(entitiesFallback) ? entitiesFallback : []),
    ...Object.keys(hass?.states || {}),
  ];

  return [...new Set(candidates)]
    .filter(
      (entityId) =>
        isTimelineEntitySupported(hass, entityId) &&
        hass.entities?.[entityId]?.hidden !== true
    )
    .slice(0, maxEntities);
}

export function createPreviewConfig(hass, entities, entitiesFallback) {
  return createTimelineConfig(
    selectPreviewEntities(hass, entities, entitiesFallback)
  );
}

const CARD_PICKER_HOSTS = new Set(['hui-card-picker', 'hui-suggestion-picker']);

export function isCardPickerPreview(element) {
  const visited = new Set();
  let current = element;

  while (current && !visited.has(current)) {
    visited.add(current);
    if (CARD_PICKER_HOSTS.has(current.localName)) return true;

    const shadowHost = current.getRootNode?.()?.host;
    current =
      shadowHost && shadowHost !== current ? shadowHost : current.parentElement;
  }

  return false;
}

export function getEffectiveTimelineLayout(configuredLayout, previewMode) {
  if (previewMode) return 'left';
  return ['center', 'left', 'right'].includes(configuredLayout)
    ? configuredLayout
    : 'center';
}
