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

  it('should explicitly keep the oldest event in a sequence of duplicates', () => {
    const entities = [{ entity: 'sensor.x', collapse_duplicates: true }];
    const items = [
      { id: 'sensor.x', raw_state: 'ON', time: 3000 }, // Newest
      { id: 'sensor.x', raw_state: 'ON', time: 2000 },
      { id: 'sensor.x', raw_state: 'ON', time: 1000 }, // Oldest
    ];

    const result = filterHistory(items, entities, 100, {});

    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(1000);
  });

  it('should keep the latest event when collapse_duplicates_keep is "latest"', () => {
    const entities = [{ entity: 'sensor.x', collapse_duplicates: true }];
    const items = [
      { id: 'sensor.x', raw_state: 'ON', time: 3000 }, // Newest
      { id: 'sensor.x', raw_state: 'ON', time: 2000 },
      { id: 'sensor.x', raw_state: 'ON', time: 1000 }, // Oldest
    ];

    const result = filterHistory(items, entities, 100, {
      collapse_duplicates_keep: 'latest',
    });

    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(3000);
  });

  it('should keep latest per run when states alternate with collapse_duplicates_keep latest', () => {
    const entities = [{ entity: 'sensor.x', collapse_duplicates: true }];
    const items = [
      { id: 'sensor.x', raw_state: 'ON', time: 100 },
      { id: 'sensor.x', raw_state: 'ON', time: 150 },
      { id: 'sensor.x', raw_state: 'OFF', time: 200 },
      { id: 'sensor.x', raw_state: 'OFF', time: 250 },
      { id: 'sensor.x', raw_state: 'ON', time: 300 },
      { id: 'sensor.x', raw_state: 'ON', time: 400 },
    ];

    const result = filterHistory(items, entities, 100, {
      collapse_duplicates_keep: 'latest',
    });

    // Expected: latest per run → t=150 (ON), t=250 (OFF), t=400 (ON)
    // Display order: newest first → [t=400, t=250, t=150]
    expect(result).toHaveLength(3);
    expect(result[0].time).toBe(400);
    expect(result[1].time).toBe(250);
    expect(result[2].time).toBe(150);
  });

  it('should support per-entity collapse_duplicates_keep override', () => {
    const entities = [
      {
        entity: 'sensor.a',
        collapse_duplicates: true,
        collapse_duplicates_keep: 'latest',
      },
      { entity: 'sensor.b', collapse_duplicates: true },
    ];
    const items = [
      { id: 'sensor.a', raw_state: 'ON', time: 100 },
      { id: 'sensor.a', raw_state: 'ON', time: 200 }, // latest for A
      { id: 'sensor.b', raw_state: 'RED', time: 300 }, // earliest for B
      { id: 'sensor.b', raw_state: 'RED', time: 400 },
    ];

    const result = filterHistory(items, entities, 100, {});

    // A: keep latest ON → t=200; B: keep earliest RED → t=300
    expect(result).toHaveLength(2);
    const times = result.map((i) => i.time);
    expect(times).toContain(200);
    expect(times).toContain(300);
    expect(times).not.toContain(100);
    expect(times).not.toContain(400);
  });

  it('calculates spans between filtered events of the same entity', () => {
    const entities = [
      { entity: 'person.alex', exclude_states: ['not_home'] },
      { entity: 'binary_sensor.door' },
    ];
    const items = [
      { id: 'person.alex', raw_state: 'home', time: 100 },
      { id: 'binary_sensor.door', raw_state: 'on', time: 150 },
      { id: 'person.alex', raw_state: 'not_home', time: 200 },
      { id: 'person.alex', raw_state: 'work', time: 300 },
    ];

    const result = filterHistory(items, entities, 100, {});
    const home = result.find((item) => item.raw_state === 'home');
    const work = result.find((item) => item.raw_state === 'work');

    expect(home.endTime).toBe(300);
    expect(work.endTime).toBeNull();
  });
});
