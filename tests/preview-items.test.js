import { describe, expect, it } from 'vitest';
import { createCurrentStatePreview } from '../src/preview-items.js';

const i18n = {
  getLocalizedState: (_entityId, state) => state,
};

describe('current-state picker preview', () => {
  it('builds timeline items locally without a history response', () => {
    const entities = [
      { entity: 'sensor.temperature' },
      { entity: 'binary_sensor.front_door' },
    ];
    const hass = {
      states: {
        'sensor.temperature': {
          entity_id: 'sensor.temperature',
          state: '21.5',
          attributes: {
            friendly_name: 'Temperature',
            unit_of_measurement: '°C',
          },
          last_changed: '2026-09-03T18:00:00Z',
        },
        'binary_sensor.front_door': {
          entity_id: 'binary_sensor.front_door',
          state: 'on',
          attributes: { friendly_name: 'Front door' },
          last_changed: '2026-09-03T19:00:00Z',
        },
      },
    };

    const items = createCurrentStatePreview(hass, entities, i18n, 10, {});

    expect(items.map(({ id }) => id)).toEqual([
      'binary_sensor.front_door',
      'sensor.temperature',
    ]);
    expect(items[1].state).toBe('21.5 °C');
  });

  it('ignores missing states and respects the configured limit', () => {
    const entities = [
      { entity: 'sensor.one' },
      { entity: 'sensor.missing' },
      { entity: 'sensor.two' },
    ];
    const hass = {
      states: {
        'sensor.one': {
          entity_id: 'sensor.one',
          state: '1',
          attributes: {},
          last_changed: '2026-09-03T18:00:00Z',
        },
        'sensor.two': {
          entity_id: 'sensor.two',
          state: '2',
          attributes: {},
          last_changed: '2026-09-03T19:00:00Z',
        },
      },
    };

    expect(createCurrentStatePreview(hass, entities, i18n, 1, {})).toHaveLength(
      1
    );
  });
});
