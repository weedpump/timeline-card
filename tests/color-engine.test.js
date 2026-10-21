import { describe, it, expect } from 'vitest';
import { resolveStateMappedColor } from '../src/color-engine.js';

describe('resolveStateMappedColor', () => {
  it('prefers entity state colors over entity static and global colors', () => {
    expect(
      resolveStateMappedColor('on', { on: 'green' }, 'orange', 'red')
    ).toBe('green');
  });

  it('prefers wildcard state colors over entity static and global colors', () => {
    expect(
      resolveStateMappedColor(
        'Open @ 20 %',
        { 'Open @ *': 'green' },
        'orange',
        'red'
      )
    ).toBe('green');
  });

  it('uses entity static color before global static color', () => {
    expect(resolveStateMappedColor('on', {}, 'orange', 'red')).toBe('orange');
  });

  it('uses global static color as fallback', () => {
    expect(resolveStateMappedColor('off', {}, null, 'blue')).toBe('blue');
  });

  it('returns an empty string without a matching configured color', () => {
    expect(resolveStateMappedColor('idle', {}, null, null)).toBe('');
  });
});
