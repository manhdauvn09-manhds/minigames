import { describe, it, expect } from 'vitest';
import { mulberry32, hashString, dailySeed } from '../random';

describe('mulberry32', () => {
  it('same seed → same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('different seeds → different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let differs = false;
    for (let i = 0; i < 50; i++) {
      if (a.next() !== b.next()) { differs = true; break; }
    }
    expect(differs).toBe(true);
  });

  it('next() in [0, 1)', () => {
    const r = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt in [0, n)', () => {
    const r = mulberry32(456);
    for (let i = 0; i < 1000; i++) {
      const v = r.nextInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('shuffle is deterministic given the seed', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    mulberry32(99).shuffle(a);
    mulberry32(99).shuffle(b);
    expect(a).toEqual(b);
  });

  it('avoids zero-state collapse', () => {
    const r = mulberry32(0);
    expect(r.next()).not.toBe(0);
  });

  it('accepts string seeds', () => {
    const a = mulberry32('daily-2026-04-26');
    const b = mulberry32('daily-2026-04-26');
    expect(a.next()).toBe(b.next());
    const c = mulberry32('daily-2026-04-27');
    expect(a.next()).not.toBe(c.next());
  });
});

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
  });
  it('varies with input', () => {
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('dailySeed', () => {
  it('formats UTC date as daily-YYYY-MM-DD', () => {
    const d = new Date(Date.UTC(2026, 3, 26)); // April 26 2026
    expect(dailySeed(d)).toBe('daily-2026-04-26');
  });
});
