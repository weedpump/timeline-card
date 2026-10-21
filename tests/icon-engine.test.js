import { describe, expect, it } from 'vitest';
import { getIconColor, getIconForEntity } from '../src/icon-engine.js';

const sensor = {
  entity_id: 'sensor.shutter_state',
  state: 'Open @ 20 %',
  attributes: {},
};

describe('getIconColor wildcards', () => {
  it('resolves icon colors from wildcard state mappings', () => {
    const cfg = {
      icon_color_map: {
        'Open @ *': 'green',
      },
    };

    expect(getIconColor(cfg, 'Open @ 20 %')).toBe('green');
  });
});

describe('getIconForEntity icon_map wildcards', () => {
  it('matches an asterisk against variable state text', () => {
    const cfg = {
      icon_map: {
        'Open @ *': 'mdi:window-shutter-open',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:window-shutter-open');
  });

  it('ignores an empty wildcard mapping and continues to the static icon', () => {
    const cfg = {
      icon: 'mdi:window-shutter',
      icon_map: {
        'Open @ *': '',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:window-shutter');
  });

  it('continues from an empty exact mapping to a matching wildcard', () => {
    const cfg = {
      icon_map: {
        'Open @ 20 %': '',
        'Open @ *': 'mdi:window-shutter-open',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:window-shutter-open');
  });

  it('continues from an empty wildcard mapping to the next match', () => {
    const cfg = {
      icon_map: {
        'Open *': '',
        '*20*': 'mdi:window-shutter-open',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:window-shutter-open');
  });

  it('prefers an exact state mapping over a matching wildcard', () => {
    const cfg = {
      icon_map: {
        'Open @ *': 'mdi:window-shutter-open',
        'Open @ 20 %': 'mdi:window-shutter-alert',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:window-shutter-alert');
  });

  it('uses the first matching wildcard in configuration order', () => {
    const cfg = {
      icon_map: {
        'Open *': 'mdi:window-shutter-open',
        '*20*': 'mdi:window-shutter-alert',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:window-shutter-open');
  });

  it('treats regular expression characters as literal text', () => {
    const cfg = {
      icon_map: {
        'Open (+) @ * %': 'mdi:window-shutter-open',
      },
    };
    const stateWithSpecialCharacters = {
      ...sensor,
      state: 'Open (+) @ 20 %',
    };

    expect(getIconForEntity(stateWithSpecialCharacters, cfg)).toBe(
      'mdi:window-shutter-open'
    );
  });

  it('continues to the default mapping when no wildcard matches', () => {
    const cfg = {
      icon_map: {
        'Closed *': 'mdi:window-shutter',
        default: 'mdi:help-circle',
      },
    };

    expect(getIconForEntity(sensor, cfg)).toBe('mdi:help-circle');
  });
});
