import { describe, it, expect } from 'vitest';
import { filterHistory } from '../src/history-filter.js';

describe('filterHistory', () => {
  it('should collapse duplicates independently for multiple entities (interleaved)', () => {
    // Configuration: both entities want duplicates collapsed
    const entities = [
      { entity: 'sensor.a', collapse_duplicates: true },
      { entity: 'sensor.b', collapse_duplicates: true },
    ];

    // Input data:
    // sensor.a toggles ON -> OFF, but has a duplicate ON in between.
    // sensor.b is RED, and has a duplicate RED in between.
    // They are interleaved in time.
    const items = [
      { id: 'sensor.a', raw_state: 'ON', time: 1000 },
      { id: 'sensor.b', raw_state: 'RED', time: 900 },
      { id: 'sensor.a', raw_state: 'ON', time: 800 }, // Duplicate of A (should be removed)
      { id: 'sensor.b', raw_state: 'RED', time: 700 }, // Duplicate of B (should be removed)
      { id: 'sensor.a', raw_state: 'OFF', time: 600 }, // New state for A (should be kept)
    ];

    const limit = 100;
    const globalConfig = {};

    const result = filterHistory(items, entities, limit, globalConfig);

    // Expected Output:
    // The duplicates at time 1000 (A) and 900 (B) should be gone (we keep the EARLIEST).
    // Remaining: A(800), B(700), A(600).
    // Result (desc): A(800), B(700), A(600)

    expect(result).toHaveLength(3);

    expect(result[0]).toMatchObject({
      id: 'sensor.a',
      time: 800,
      raw_state: 'ON',
    });
    expect(result[1]).toMatchObject({
      id: 'sensor.b',
      time: 700,
      raw_state: 'RED',
    });
    expect(result[2]).toMatchObject({
      id: 'sensor.a',
      time: 600,
      raw_state: 'OFF',
    });
  });

  it('should respect per-entity configuration for collapsing', () => {
    const entities = [
      { entity: 'sensor.a', collapse_duplicates: true },
      { entity: 'sensor.b', collapse_duplicates: false }, // B keeps duplicates
    ];

    const items = [
      { id: 'sensor.a', raw_state: 'ON', time: 1000 },
      { id: 'sensor.a', raw_state: 'ON', time: 900 }, // Dup A -> keep 900 (earliest), drop 1000
      { id: 'sensor.b', raw_state: 'RED', time: 800 },
      { id: 'sensor.b', raw_state: 'RED', time: 700 }, // Dup B -> kept (config=false)
    ];

    const result = filterHistory(items, entities, 100, {});

    expect(result).toHaveLength(3);
    // A(1000) removed, A(900) kept. B both kept.
    const times = result.map((i) => i.time);
    expect(times).not.toContain(1000);
    expect(times).toContain(900);
    expect(times).toContain(800);
    expect(times).toContain(700);
  });
});
