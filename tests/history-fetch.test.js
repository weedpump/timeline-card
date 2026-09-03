import { describe, expect, it, vi } from 'vitest';
import { fetchHistory } from '../src/history-fetch.js';

describe('fetchHistory', () => {
  it('does not call the history API without entities', async () => {
    const hass = { callApi: vi.fn() };

    const result = await fetchHistory(hass, [], 6);

    expect(hass.callApi).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.start).toBeInstanceOf(Date);
  });
});
