import { describe, expect, it } from 'vitest';
import {
  createEntitySuggestion,
  createPreviewConfig,
  isGeneralCardPickerPreview,
  isTimelineEntitySupported,
  selectPreviewEntities,
} from '../src/card-picker.js';

const createHass = (...entityIds) => ({
  states: Object.fromEntries(
    entityIds.map((entity_id) => [entity_id, { entity_id, state: 'on' }])
  ),
});

describe('Timeline Card entity suggestions', () => {
  it('creates a complete config using only the selected entity', () => {
    const hass = createHass('binary_sensor.front_door', 'person.tobi');

    expect(createEntitySuggestion(hass, 'binary_sensor.front_door')).toEqual({
      config: {
        type: 'custom:timeline-card',
        title: 'Timeline',
        hours: 6,
        limit: 10,
        relative_time: true,
        show_names: true,
        show_states: true,
        show_icons: true,
        entities: [{ entity: 'binary_sensor.front_door' }],
      },
    });
  });

  it.each([
    'button.restart',
    'input_button.doorbell',
    'scene.evening',
    'script.good_night',
  ])('does not suggest a timeline for action-only entity %s', (entityId) => {
    const hass = createHass(entityId);

    expect(isTimelineEntitySupported(hass, entityId)).toBe(false);
    expect(createEntitySuggestion(hass, entityId)).toBeNull();
  });

  it('does not suggest a timeline for a missing or malformed entity', () => {
    const hass = createHass('sensor.temperature');

    expect(createEntitySuggestion(hass, 'sensor.missing')).toBeNull();
    expect(createEntitySuggestion(hass, 'malformed')).toBeNull();
    expect(createEntitySuggestion(undefined, 'sensor.temperature')).toBeNull();
  });

  it.each([
    'sensor.temperature',
    'binary_sensor.front_door',
    'person.tobi',
    'light.kitchen',
    'automation.arrival',
  ])('supports stateful entity %s', (entityId) => {
    const hass = createHass(entityId);

    expect(isTimelineEntitySupported(hass, entityId)).toBe(true);
  });
});

describe('Timeline Card picker preview', () => {
  it('selects up to three unique supported entities in HA priority order', () => {
    const hass = createHass(
      'button.restart',
      'binary_sensor.front_door',
      'sensor.temperature',
      'person.tobi',
      'light.kitchen'
    );

    expect(
      selectPreviewEntities(
        hass,
        [
          'button.restart',
          'binary_sensor.front_door',
          'sensor.temperature',
          'binary_sensor.front_door',
        ],
        ['person.tobi', 'light.kitchen']
      )
    ).toEqual([
      'binary_sensor.front_door',
      'sensor.temperature',
      'person.tobi',
    ]);
  });

  it('falls back to visible Home Assistant states', () => {
    const hass = createHass(
      'button.restart',
      'sensor.temperature',
      'binary_sensor.front_door'
    );
    hass.entities = {
      'sensor.temperature': { hidden: true },
      'binary_sensor.front_door': { hidden: false },
    };

    expect(selectPreviewEntities(hass, [], [])).toEqual([
      'binary_sensor.front_door',
    ]);
  });

  it('creates a valid stub config without a custom card type', () => {
    const hass = createHass('sensor.temperature', 'binary_sensor.front_door');

    expect(
      createPreviewConfig(
        hass,
        ['sensor.temperature'],
        ['binary_sensor.front_door']
      )
    ).toEqual({
      title: 'Timeline',
      hours: 6,
      limit: 10,
      relative_time: true,
      show_names: true,
      show_states: true,
      show_icons: true,
      entities: [
        { entity: 'sensor.temperature' },
        { entity: 'binary_sensor.front_door' },
      ],
    });
  });

  it('returns a valid empty fallback when no suitable entity exists', () => {
    const hass = createHass('button.restart');

    expect(createPreviewConfig(hass, [], []).entities).toEqual([]);
  });

  it('detects only the general card picker shadow-root context', () => {
    expect(
      isGeneralCardPickerPreview({
        getRootNode: () => ({ host: { localName: 'hui-card-picker' } }),
      })
    ).toBe(true);
    expect(
      isGeneralCardPickerPreview({
        getRootNode: () => ({ host: { localName: 'hui-card' } }),
      })
    ).toBe(false);
    expect(isGeneralCardPickerPreview({})).toBe(false);
  });
});
