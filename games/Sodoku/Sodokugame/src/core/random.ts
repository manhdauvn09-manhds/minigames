// Seeded PRNG — mulberry32. Deterministic given the seed.
//
// Why a custom PRNG instead of `Math.random`:
//   - Daily Challenge needs every player on a given date to receive the
//     SAME puzzle. Same seed → same shuffle → same removal order →
//     same `Puzzle`.
//   - Multiplayer Race (Phase 7B) uses the same trick so two browsers
//     can negotiate one seed and run the engine independently.
//   - Generator unit tests need reproducibility; failing on a flaky
//     puzzle once every 200 runs is unactionable.
//
// mulberry32 is a 32-bit PRNG with period 2^32 and uniform output. Not
// crypto-grade — we don't need that. Tiny code, good distribution,
// trivially port-able to Python (Phase 7A backend) for cross-language
// determinism.

export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an int in [0, n). Bias-free for n up to ~2^31. */
  nextInt(n: number): number;
  /** In-place Fisher-Yates shuffle. */
  shuffle<T>(arr: T[]): T[];
  /** Pick one element uniformly. Throws on empty array. */
  pick<T>(arr: readonly T[]): T;
}

export function mulberry32(seed: number | string): Rng {
  let s = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  // Avoid the all-zero state which produces 0 for the first call.
  if (s === 0) s = 0xDEADBEEF;

  function next(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(n: number): number {
    return Math.floor(next() * n);
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }

  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick(): empty array');
    return arr[nextInt(arr.length)]!;
  }

  return { next, nextInt, shuffle, pick };
}

/** djb2 32-bit string hash — fold any string seed into a 32-bit int.
 *
 * Used so callers can seed with a human-readable string like
 * "daily-2026-04-26" or a UUID and still get a deterministic puzzle. */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i); // h * 33 + c
    h |= 0; // force int32
  }
  return h >>> 0;
}

/** Build the canonical seed string for a daily challenge.
 *
 * Same format used by the (future) backend so Phase 7A can validate
 * `puzzle_seed` from a submission against the server's expected daily
 * seed for that date. */
export function dailySeed(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `daily-${y}-${m}-${d}`;
}
