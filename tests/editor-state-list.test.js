import { describe, expect, it } from 'vitest';
import {
  parseStateList,
  stringifyStateList,
} from '../src/editor/state-list.js';
import { passesStateFilter } from '../src/state-pattern.js';

describe('state list editor', () => {
  it.each(["- '* %'", '- "* %"', '- * %'])(
    'accepts %s as a wildcard pattern in either filter',
    (input) => {
      const patterns = parseStateList(input);

      expect(patterns).toEqual(['* %']);
      expect(
        passesStateFilter('Open @ 20 %', { include_states: patterns })
      ).toBe(true);
      expect(
        passesStateFilter('Open @ 20 %', { exclude_states: patterns })
      ).toBe(false);
    }
  );

  it('keeps literal quotes, spaces, and hash signs within quoted states', () => {
    const input = `- 'It''s open *'\n- "Say \\"open\\" *" # comment\n- ' #open* ' `;

    expect(parseStateList(input)).toEqual([
      "It's open *",
      'Say "open" *',
      ' #open* ',
    ]);
  });

  it('round-trips existing patterns through the editor text', () => {
    const patterns = ['Closed', '* %', 'Open @ *', "'quoted'", ' open ', ''];

    expect(parseStateList(stringifyStateList(patterns))).toEqual(patterns);
    expect(parseStateList('   \n- ')).toBeUndefined();
  });
});
