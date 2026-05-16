// Pre-generated puzzle pool — fallback if runtime generation exceeds
// budget on Level 4-5. Phase 2 ships an EMPTY pool with a generator
// script (`scripts/demo-generate.ts` — Phase 2.5 will land
// `scripts/build-pool.ts` to populate JSON files committed to repo).
//
// API:
//   - poolPickRandom(level, rng): returns a Puzzle from the pool, or
//     null if the pool for that level is empty.
//   - generatePuzzleWithFallback(level, seed, budgetMs): runs the live
//     generator with a wall-clock budget; if it overruns, returns a
//     pool puzzle instead.

import { generatePuzzle } from './generator';
import { mulberry32 } from './random';
import type { DifficultyLevel, Puzzle } from './types';

// Pool storage. Phase 2.5 swaps these `[]` for the JSON imports —
// `import L1 from './puzzles/L1.json'`. Empty for now.
const POOL: Record<DifficultyLevel, Puzzle[]> = {
  1: [], 2: [], 3: [], 4: [], 5: [],
};

export function poolSize(level: DifficultyLevel): number {
  return POOL[level].length;
}

export function poolPickRandom(level: DifficultyLevel, seed?: number | string): Puzzle | null {
  const pool = POOL[level];
  if (pool.length === 0) return null;
  const rng = mulberry32(seed ?? Date.now());
  return pool[rng.nextInt(pool.length)];
}

export interface GenerateOptions {
  /** Optional seed for determinism. */
  seed?: number | string;
  /** Wall-clock budget. Default 5000ms. Past this, fall back to pool. */
  budgetMs?: number;
}

export function generatePuzzleWithFallback(
  level: DifficultyLevel,
  opts: GenerateOptions = {},
): Puzzle {
  const budget = opts.budgetMs ?? 5000;
  const t0 = Date.now();
  // The live generator is synchronous; we can't actually preempt it
  // mid-run. The budget is informational here — we use it to choose
  // pool over generator at the call site. For true preemption the
  // worker (Phase 1 already wired vite-plugin-pwa side; engine worker
  // lands in a follow-up) would terminate after `budgetMs`.
  const puzzle = generatePuzzle(level, opts.seed);
  const elapsed = Date.now() - t0;
  if (elapsed > budget) {
    const pooled = poolPickRandom(level, opts.seed);
    if (pooled) return pooled;
    // Pool empty: surface the slow puzzle anyway, but tag the seed so
    // ops can grep + backfill the pool later.
    return { ...puzzle, seed: `${puzzle.seed}#slow:${elapsed}ms` };
  }
  return puzzle;
}
