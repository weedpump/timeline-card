import { describe, expect, it } from 'vitest';
import {
  annotateEventDurations,
  closePreviousEvent,
  insertLiveEvent,
} from '../src/event-duration.js';

describe('event duration metadata', () => {
  it('links each filtered event to the next event of the same entity', () => {
    const items = [
      { id: 'person.alex', time: new Date('2026-09-28T08:22:00Z') },
      { id: 'binary_sensor.door', time: new Date('2026-09-28T09:00:00Z') },
      { id: 'person.alex', time: new Date('2026-09-28T10:44:00Z') },
    ];

    const result = annotateEventDurations(items);

    expect(result[0].endTime).toEqual(new Date('2026-09-28T10:44:00Z'));
    expect(result[1].endTime).toBeNull();
    expect(result[2].endTime).toBeNull();
  });

  it('does not mutate the source events', () => {
    const items = [
      { id: 'sensor.a', time: new Date('2026-09-28T08:00:00Z') },
      { id: 'sensor.a', time: new Date('2026-09-28T09:00:00Z') },
    ];

    annotateEventDurations(items);

    expect(items[0]).not.toHaveProperty('endTime');
    expect(items[1]).not.toHaveProperty('endTime');
  });

  it('closes the previous visible live event of the same entity', () => {
    const previous = {
      id: 'person.alex',
      time: new Date('2026-09-28T08:22:00Z'),
      endTime: null,
    };
    const other = {
      id: 'binary_sensor.door',
      time: new Date('2026-09-28T09:00:00Z'),
      endTime: null,
    };
    const next = {
      id: 'person.alex',
      time: new Date('2026-09-28T10:44:00Z'),
      endTime: null,
    };
    const items = [other, previous];

    expect(closePreviousEvent(items, next)).toBe(true);
    expect(previous.endTime).toEqual(next.time);
    expect(other.endTime).toBeNull();
  });

  it('replaces a duplicate live event when the latest duplicate is configured', () => {
    const previous = {
      id: 'sensor.mode',
      raw_state: 'active',
      time: new Date('2026-09-28T08:00:00Z'),
      endTime: null,
    };
    const next = {
      id: 'sensor.mode',
      raw_state: 'active',
      time: new Date('2026-09-28T09:00:00Z'),
    };
    const items = [previous];

    expect(
      insertLiveEvent(items, next, {
        collapseDuplicates: true,
        keepMode: 'latest',
      })
    ).toBe(true);
    expect(items).toEqual([next]);
  });

  it('moves the previous visible span end when replacing the latest duplicate', () => {
    const off = {
      id: 'sensor.mode',
      raw_state: 'off',
      time: new Date('2026-09-28T08:00:00Z'),
      endTime: new Date('2026-09-28T10:00:00Z'),
    };
    const previousOn = {
      id: 'sensor.mode',
      raw_state: 'on',
      time: new Date('2026-09-28T10:00:00Z'),
      endTime: null,
    };
    const latestOn = {
      id: 'sensor.mode',
      raw_state: 'on',
      time: new Date('2026-09-28T11:00:00Z'),
    };
    const items = [previousOn, off];

    insertLiveEvent(items, latestOn, {
      collapseDuplicates: true,
      keepMode: 'latest',
    });

    expect(items).toEqual([latestOn, off]);
    expect(off.endTime).toEqual(latestOn.time);
  });

  it('ignores a duplicate live event when the earliest duplicate is configured', () => {
    const previous = {
      id: 'sensor.mode',
      raw_state: 'active',
      time: new Date('2026-09-28T08:00:00Z'),
      endTime: null,
    };
    const next = {
      id: 'sensor.mode',
      raw_state: 'active',
      time: new Date('2026-09-28T09:00:00Z'),
    };
    const items = [previous];

    expect(
      insertLiveEvent(items, next, {
        collapseDuplicates: true,
        keepMode: 'earliest',
      })
    ).toBe(false);
    expect(items).toEqual([previous]);
  });
});
