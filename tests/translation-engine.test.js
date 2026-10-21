import { describe, expect, it } from 'vitest';
import { TranslationEngine } from '../src/translation-engine.js';

const translations = {
  'en-us': {
    status: {},
  },
};

describe('TranslationEngine state_map wildcards', () => {
  it('uses a wildcard label for matching raw states', () => {
    const engine = new TranslationEngine(translations);
    const cfg = {
      state_map: {
        'Open @ *': 'Open',
      },
    };

    expect(engine.getLocalizedState('sensor.shutter', 'Open @ 20 %', cfg)).toBe(
      'Open'
    );
  });
});
