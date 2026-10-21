import { describe, expect, it } from 'vitest';
import { renameMapKey } from '../src/editor/map-utils.js';

describe('renameMapKey', () => {
  it('preserves wildcard priority when renaming a key', () => {
    const map = {
      'Open *': 'first',
      '*20*': 'second',
      Closed: 'third',
    };

    const renamed = renameMapKey(map, 'Open *', 'Open @ *');

    expect(Object.keys(renamed)).toEqual(['Open @ *', '*20*', 'Closed']);
    expect(renamed['Open @ *']).toBe('first');
  });

  it('keeps the source priority when the target key already exists', () => {
    const map = {
      'Open*': 'destination',
      '*': 'middle',
      '*20*': 'renamed-value',
    };

    const renamed = renameMapKey(map, '*20*', 'Open*');

    expect(Object.keys(renamed)).toEqual(['*', 'Open*']);
    expect(renamed['Open*']).toBe('renamed-value');
  });
});
