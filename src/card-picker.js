const ACTION_ONLY_DOMAINS = new Set([
  'button',
  'input_button',
  'scene',
  'script',
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
    Object.hasOwn(hass.states, entityId) && !ACTION_ONLY_DOMAINS.has(domain)
  );
}

export function createEntitySuggestion(hass, entityId) {
  if (!isTimelineEntitySupported(hass, entityId)) return null;

  return {
    config: createTimelineConfig([entityId], { includeType: true }),
  };
}
