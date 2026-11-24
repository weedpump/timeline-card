export function renameMapKey(map, oldKey, newKey) {
  const current = map || {};
  if (!Object.prototype.hasOwnProperty.call(current, oldKey)) {
    return { ...current };
  }

  return Object.fromEntries(
    Object.entries(current).flatMap(([key, value]) => {
      if (key === oldKey) return [[newKey, value]];
      if (key === newKey) return [];
      return [[key, value]];
    })
  );
}
