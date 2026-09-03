import { describe, expect, it } from 'vitest';
import {
  createEntitySuggestion,
  createPreviewConfig,
  getEffectiveTimelineLayout,
  isCardPickerPreview,
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
    'conversation.assistant',
    'input_button.doorbell',
    'input_select.mode',
    'notify.mobile_app',
    'scene.evening',
    'script.good_night',
    'stt.cloud',
    'tts.cloud',
    'unknown_custom.entity',
    'wake_word.openwakeword',
  ])(
    'does not suggest a timeline for non-allowlisted entity %s',
    (entityId) => {
      const hass = createHass(entityId);

      expect(isTimelineEntitySupported(hass, entityId)).toBe(false);
      expect(createEntitySuggestion(hass, entityId)).toBeNull();
    }
  );

  it('does not suggest a timeline for a missing or malformed entity', () => {
    const hass = createHass('sensor.temperature');

    expect(createEntitySuggestion(hass, 'sensor.missing')).toBeNull();
    expect(createEntitySuggestion(hass, 'malformed')).toBeNull();
    expect(createEntitySuggestion(undefined, 'sensor.temperature')).toBeNull();
  });

  it.each([
    'alarm_control_panel.home',
    'automation.arrival',
    'binary_sensor.front_door',
    'calendar.family',
    'climate.living_room',
    'cover.garage',
    'device_tracker.phone',
    'event.doorbell',
    'fan.bedroom',
    'humidifier.bedroom',
    'input_boolean.mailbox',
    'lawn_mower.garden',
    'light.kitchen',
    'lock.front_door',
    'media_player.living_room',
    'person.tobi',
    'remote.harmony',
    'schedule.heating',
    'sensor.temperature',
    'siren.alarm',
    'sun.sun',
    'switch.coffee_machine',
    'timer.laundry',
    'update.home_assistant',
    'vacuum.roborock',
    'valve.garden',
    'water_heater.boiler',
    'weather.home',
  ])('supports allowlisted entity %s', (entityId) => {
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

  it('detects direct and nested card picker shadow-root contexts', () => {
    expect(
      isCardPickerPreview({
        getRootNode: () => ({ host: { localName: 'hui-card-picker' } }),
      })
    ).toBe(true);

    const suggestionPicker = { localName: 'hui-suggestion-picker' };
    const suggestionCard = {
      localName: 'hui-suggestion-card',
      getRootNode: () => ({ host: suggestionPicker }),
    };
    expect(
      isCardPickerPreview({
        getRootNode: () => ({ host: suggestionCard }),
      })
    ).toBe(true);
  });

  it('does not treat the card editor preview as a picker preview', () => {
    expect(
      isCardPickerPreview({
        preview: true,
        getRootNode: () => ({
          host: {
            localName: 'hui-dialog-edit-card',
            getRootNode: () => ({ host: null }),
          },
        }),
      })
    ).toBe(false);
    expect(isCardPickerPreview({ preview: true })).toBe(false);
  });

  it('uses a left layout only while rendering a picker preview', () => {
    expect(getEffectiveTimelineLayout('center', true)).toBe('left');
    expect(getEffectiveTimelineLayout('right', true)).toBe('left');
    expect(getEffectiveTimelineLayout('center', false)).toBe('center');
    expect(getEffectiveTimelineLayout('right', false)).toBe('right');
  });
});
