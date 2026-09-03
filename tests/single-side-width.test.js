import { describe, expect, it } from 'vitest';
import { measureUntransformedWidth } from '../src/single-side-width.js';

describe('single-sided card width measurement', () => {
  it('uses layout pixels instead of transformed visual pixels', () => {
    const element = {
      scrollWidth: 224,
      getBoundingClientRect: () => ({ width: 168 }),
    };

    expect(measureUntransformedWidth(element)).toBe(224);
  });
});
