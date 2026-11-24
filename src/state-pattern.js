function buildPrefixTable(literal) {
  const table = new Array(literal.length).fill(0);
  let prefixLength = 0;

  for (let index = 1; index < literal.length; index += 1) {
    while (prefixLength > 0 && literal[index] !== literal[prefixLength]) {
      prefixLength = table[prefixLength - 1];
    }
    if (literal[index] === literal[prefixLength]) {
      prefixLength += 1;
      table[index] = prefixLength;
    }
  }

  return table;
}

function findLiteral(value, literal, start, maxStart) {
  if (literal.length === 0) return start;
  if (maxStart < start) return -1;

  const table = buildPrefixTable(literal);
  const scanEnd = Math.min(value.length, maxStart + literal.length);
  let matchedLength = 0;

  for (let index = start; index < scanEnd; index += 1) {
    while (matchedLength > 0 && value[index] !== literal[matchedLength]) {
      matchedLength = table[matchedLength - 1];
    }
    if (value[index] === literal[matchedLength]) {
      matchedLength += 1;
    }
    if (matchedLength === literal.length) {
      return index - literal.length + 1;
    }
  }

  return -1;
}

export function matchesGlob(value, pattern) {
  if (typeof value !== 'string' || typeof pattern !== 'string') return false;
  if (!pattern.includes('*')) return value === pattern;

  const startsWithWildcard = pattern.startsWith('*');
  const endsWithWildcard = pattern.endsWith('*');
  const literals = pattern.split('*').filter(Boolean);
  if (literals.length === 0) return true;

  let position = 0;
  let literalIndex = 0;

  if (!startsWithWildcard) {
    const first = literals[0];
    if (!value.startsWith(first)) return false;
    position = first.length;
    literalIndex = 1;
  }

  let middleEnd = literals.length;
  let suffixStart = value.length;

  if (!endsWithWildcard) {
    const last = literals[literals.length - 1];
    suffixStart = value.length - last.length;
    if (suffixStart < position || !value.endsWith(last)) return false;
    middleEnd -= 1;
  }

  for (; literalIndex < middleEnd; literalIndex += 1) {
    const literal = literals[literalIndex];
    const foundAt = findLiteral(
      value,
      literal,
      position,
      suffixStart - literal.length
    );
    if (foundAt === -1) return false;
    position = foundAt + literal.length;
  }

  return position <= suffixStart;
}

export function matchesStatePattern(state, pattern) {
  if (state === pattern) return true;
  return (
    typeof pattern === 'string' &&
    pattern.includes('*') &&
    matchesGlob(state, pattern)
  );
}

export function resolveStateMap(map, state) {
  const rawState = `${state ?? ''}`;

  if (map?.[rawState]) return map[rawState];

  for (const [pattern, value] of Object.entries(map || {})) {
    if (!value || !pattern.includes('*')) continue;
    if (matchesGlob(rawState, pattern)) return value;
  }
}

export function passesStateFilter(state, cfg) {
  const include = Array.isArray(cfg?.include_states)
    ? cfg.include_states
    : null;
  const exclude = Array.isArray(cfg?.exclude_states)
    ? cfg.exclude_states
    : null;

  if (include) {
    return include.some((pattern) => matchesStatePattern(state, pattern));
  }
  if (exclude) {
    return !exclude.some((pattern) => matchesStatePattern(state, pattern));
  }
  return true;
}
