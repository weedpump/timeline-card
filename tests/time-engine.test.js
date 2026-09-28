import { describe, expect, it } from 'vitest';
import { formatDuration, formatEventTime } from '../src/time-engine.js';

const i18n = {
  t: (key, vars = {}) => {
    if (key === 'time.since') return `since ${vars.duration}`;
    return key;
  },
};

describe('duration formatting', () => {
  it('uses the largest complete localized unit', () => {
    expect(formatDuration(30_000, 'en-US')).toBe('30 seconds');
    expect(formatDuration(2 * 60 * 60 * 1000 + 22 * 60 * 1000, 'en-US')).toBe(
      '2 hours'
    );
    expect(formatDuration(2 * 60 * 60 * 1000, 'de-DE')).toBe('2 Stunden');
  });

  it('falls back safely for invalid locale configuration', () => {
    expect(formatDuration(2 * 60 * 60 * 1000, 'auto')).toBe('2 hours');
  });

  it('appends a completed duration to an absolute timestamp', () => {
    const item = {
      time: new Date('2026-09-28T08:22:00Z'),
      endTime: new Date('2026-09-28T10:44:00Z'),
    };

    expect(
      formatEventTime(item, {
        langCode: 'en-US',
        i18n,
        includeDate: false,
        showDuration: true,
        now: new Date('2026-09-28T12:00:00Z'),
      })
    ).toMatch(/\(2 hours\)$/);
  });

  it('shows since for the current event in absolute time mode', () => {
    const item = {
      time: new Date('2026-09-28T08:00:00Z'),
      endTime: null,
    };

    expect(
      formatEventTime(item, {
        langCode: 'en-US',
        i18n,
        includeDate: false,
        showDuration: true,
        now: new Date('2026-09-28T10:00:00Z'),
      })
    ).toMatch(/\(since 2 hours\)$/);
  });

  it('avoids a redundant relative timestamp for the current event', () => {
    const item = {
      time: new Date('2026-09-28T08:00:00Z'),
      endTime: null,
    };

    expect(
      formatEventTime(item, {
        langCode: 'en-US',
        i18n,
        relative: true,
        showDuration: true,
        now: new Date('2026-09-28T10:00:00Z'),
      })
    ).toBe('since 2 hours');
  });

  it('uses the injected clock for completed relative events', () => {
    const relativeI18n = {
      t: (key, vars = {}) => {
        if (key === 'time.hours') return `${vars.n} hours ago`;
        return key;
      },
    };
    const item = {
      time: new Date('2026-09-28T08:00:00Z'),
      endTime: new Date('2026-09-28T09:00:00Z'),
    };

    expect(
      formatEventTime(item, {
        langCode: 'en-US',
        i18n: relativeI18n,
        relative: true,
        showDuration: true,
        now: new Date('2026-09-28T10:00:00Z'),
      })
    ).toBe('2 hours ago (1 hour)');
  });
});
