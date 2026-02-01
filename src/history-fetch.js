export async function fetchHistory(hass, entities, hours) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

  const startTime = start.toISOString();
  const endTime = end.toISOString();

  const entityParam = entities.map((e) => e.entity).join(',');

  const data = await hass.callApi(
    'GET',
    `history/period/${startTime}?filter_entity_id=${entityParam}&end_time=${endTime}`
  );

  return { data, start };
}
