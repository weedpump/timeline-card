import { describe, expect, it } from 'vitest';
import {
  matchesGlob,
  matchesStatePattern,
  passesStateFilter,
  resolveStateMap,
} from '../src/state-pattern.js';

function referenceGlob(value, pattern) {
  const rows = Array.from({ length: value.length + 1 }, () =>
    new Array(pattern.length + 1).fill(false)
  );
  rows[0][0] = true;

  for (
    let patternIndex = 1;
    patternIndex <= pattern.length;
    patternIndex += 1
  ) {
    if (pattern[patternIndex - 1] === '*') {
      rows[0][patternIndex] = rows[0][patternIndex - 1];
    }
  }

  for (let valueIndex = 1; valueIndex <= value.length; valueIndex += 1) {
    for (
      let patternIndex = 1;
      patternIndex <= pattern.length;
      patternIndex += 1
    ) {
      if (pattern[patternIndex - 1] === '*') {
        rows[valueIndex][patternIndex] =
          rows[valueIndex][patternIndex - 1] ||
          rows[valueIndex - 1][patternIndex];
      } else {
        rows[valueIndex][patternIndex] =
          rows[valueIndex - 1][patternIndex - 1] &&
          value[valueIndex - 1] === pattern[patternIndex - 1];
      }
    }
  }

  return rows[value.length][pattern.length];
}

function generateStrings(alphabet, maxLength) {
  const values = [''];
  for (let length = 1; length <= maxLength; length += 1) {
    const previous = values.filter((value) => value.length === length - 1);
    for (const prefix of previous) {
      for (const character of alphabet) values.push(prefix + character);
    }
  }
  return values;
}

describe('state pattern matching', () => {
  it('allows an asterisk to match an empty string', () => {
    expect(matchesGlob('', '*')).toBe(true);
  });

  it('matches multiple wildcard sections', () => {
    expect(matchesGlob('Open kitchen @ 20 %', 'Open*@*%')).toBe(true);
  });

  it('matches exact values and asterisk wildcards', () => {
    expect(matchesStatePattern('Open @ 20 %', 'Open @ 20 %')).toBe(true);
    expect(matchesStatePattern('Open @ 20 %', 'Open @ *')).toBe(true);
    expect(matchesStatePattern('Closed', 'Open @ *')).toBe(false);
  });

  it('rejects a long literal suffix within a bounded time', () => {
    const pattern = `*${'a'.repeat(10_000)}b`;
    const value = `${'a'.repeat(20_000)}c`;
    const started = performance.now();

    expect(matchesGlob(value, pattern)).toBe(false);
    expect(performance.now() - started).toBeLessThan(100);
  });

  it('matches many wildcard sections without regular expressions', () => {
    const pattern = `${'*a'.repeat(16)}*b`;
    const value = `${'a'.repeat(200)}c`;

    expect(matchesGlob(value, pattern)).toBe(false);
  });

  it('matches the reference semantics for short values and patterns', () => {
    const values = generateStrings(['a', 'b'], 4);
    const patterns = generateStrings(['a', 'b', '*'], 4);

    for (const value of values) {
      for (const pattern of patterns) {
        expect(matchesGlob(value, pattern), `${value} / ${pattern}`).toBe(
          referenceGlob(value, pattern)
        );
      }
    }
  });
});

describe('resolveStateMap', () => {
  it('prefers a non-empty exact value over wildcard entries', () => {
    expect(
      resolveStateMap(
        {
          'Open @ *': 'wildcard',
          'Open @ 20 %': 'exact',
        },
        'Open @ 20 %'
      )
    ).toBe('exact');
  });

  it('uses the first non-empty matching wildcard', () => {
    expect(
      resolveStateMap(
        {
          'Open *': '',
          'Open @ *': 'first',
          '*20*': 'second',
        },
        'Open @ 20 %'
      )
    ).toBe('first');
  });
});

describe('passesStateFilter', () => {
  it('includes states matching any configured pattern', () => {
    expect(
      passesStateFilter('Open @ 20 %', {
        include_states: ['Closed', 'Open @ *'],
      })
    ).toBe(true);
    expect(
      passesStateFilter('Unknown', {
        include_states: ['Closed', 'Open @ *'],
      })
    ).toBe(false);
  });

  it('excludes states matching any configured pattern', () => {
    expect(
      passesStateFilter('Unknown device', {
        exclude_states: ['Unknown*', 'Unavailable*'],
      })
    ).toBe(false);
    expect(
      passesStateFilter('Open @ 20 %', {
        exclude_states: ['Unknown*', 'Unavailable*'],
      })
    ).toBe(true);
  });
});
