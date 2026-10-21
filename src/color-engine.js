import { resolveStateMap } from './state-pattern.js';

export function resolveStateMappedColor(
  state,
  entityMap,
  entityColor,
  globalColor
) {
  const rawState = `${state ?? ''}`;

  const mappedColor = resolveStateMap(entityMap, rawState);
  if (mappedColor) return mappedColor;
  if (entityColor) return entityColor;
  if (globalColor) return globalColor;

  return '';
}
