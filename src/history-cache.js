// Simple in-memory history cache.
// Keyed by: entity list + hours + language.
// Cached data expires after a configurable duration.

const CACHE_TTL = 60 * 1000; // 1 minute (customize)

const cache = new Map();

function buildKey(entities, hours, lang) {
  const ids = entities
    .map((e) => e.entity)
    .sort()
    .join(',');
  return `${ids}__${hours}__${lang}`;
}

export function getCachedHistory(entities, hours, lang) {
  const key = buildKey(entities, hours, lang);
  const entry = cache.get(key);

  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCachedHistory(entities, hours, lang, data) {
  const key = buildKey(entities, hours, lang);

  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}
