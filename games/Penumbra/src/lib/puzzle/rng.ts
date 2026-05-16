/**
 * mulberry32 — small, fast, seedable PRNG. Same algorithm as the Sodoku
 * subapp uses; deterministic given a seed, so the daily puzzle generator
 * stays reproducible.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates in place using the given rng. */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = a;
  }
  return arr;
}

/** Pick k unique elements from arr (returns a new array). */
export function sample<T>(arr: T[], k: number, rng: () => number): T[] {
  const copy = arr.slice();
  shuffle(copy, rng);
  return copy.slice(0, Math.min(k, copy.length));
}
