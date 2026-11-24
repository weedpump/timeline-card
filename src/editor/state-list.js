function parseStatePattern(value) {
  const singleQuoted = value.match(/^'((?:[^']|'')*)'(?:\s+#.*)?$/);
  if (singleQuoted) return singleQuoted[1].replaceAll("''", "'");

  const doubleQuoted = value.match(/^("(?:[^"\\]|\\.)*")(?:\s+#.*)?$/);
  if (doubleQuoted) {
    try {
      return JSON.parse(doubleQuoted[1]);
    } catch {
      // Keep the input as typed while a quoted pattern is being edited.
    }
  }

  return value;
}

export function parseStateList(text) {
  const patterns = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => parseStatePattern(line.slice(2)));

  return patterns.length ? patterns : undefined;
}

export function stringifyStateList(patterns) {
  if (!Array.isArray(patterns)) return '';

  return patterns
    .map((pattern) => {
      const value = String(pattern);
      const needsQuotes =
        !value ||
        /^[*'"]/.test(value) ||
        value !== value.trim() ||
        /[\r\n]/.test(value);
      return `- ${needsQuotes ? JSON.stringify(value) : value}`;
    })
    .join('\n');
}
