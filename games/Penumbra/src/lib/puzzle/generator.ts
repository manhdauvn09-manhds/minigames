import { emptyBoard, idx, neighbors } from "./board";
import { mulberry32, sample, shuffle } from "./rng";
import type { Board, Position, Puzzle } from "./types";

/**
 * Generate a Penumbra puzzle for the given difficulty (1..10) + seed.
 *
 * Algorithm (v1, no portals/switches):
 *   1. Pick a board size from difficulty: 4×4 (d=1-2) up to 9×9 (d=9-10).
 *   2. Build a self-avoiding random walk from a random start cell — that
 *      walk IS the canonical solution path. Try multiple seeds; keep the
 *      longest one whose length ≥ targetCoverage * size².
 *   3. Mark walk endpoints as "lantern".
 *   4. Sample N interior path cells as "bright" (must-visit). N grows
 *      with difficulty.
 *   5. Mark non-path cells as "void" with probability that grows with
 *      difficulty (more voids = more constrained = harder).
 *   6. Everything else = "empty".
 */
export function generatePuzzle(difficulty: number, seed: number): Puzzle {
  const d = Math.max(1, Math.min(10, Math.floor(difficulty)));
  const rng = mulberry32(seed);

  // 4x4 at d=1-2, 5x5 at d=3-4, ..., 9x9 at d=9-10.
  const size = 4 + Math.min(5, Math.floor((d - 1) / 2));

  const targetCoverage = 0.55 + 0.04 * d; // 0.59 → 0.95
  const targetLen = Math.max(8, Math.floor(size * size * Math.min(0.95, targetCoverage)));

  const path = bestRandomWalk(size, rng, targetLen, 30);

  const board: Board = emptyBoard(size, size);

  // Lanterns at endpoints.
  const start = path[0]!;
  const end = path[path.length - 1]!;
  board.cells[idx(size, start)] = { type: "lantern" };
  board.cells[idx(size, end)] = { type: "lantern" };
  board.lanterns = [start, end];

  // Bright cells: sampled from interior path cells (not lanterns).
  const interior = path.slice(1, -1);
  const brightTarget = Math.max(0, Math.min(interior.length, Math.floor((d + 1) / 2)));
  // Pick brightTarget cells from interior, biased toward middle.
  const brights = sample(interior, brightTarget, rng);
  for (const b of brights) {
    board.cells[idx(size, b)] = { type: "bright" };
  }
  board.brightCount = brights.length;

  // Voids on non-path cells. Higher difficulty → more voids.
  const pathSet = new Set(path.map((p) => idx(size, p)));
  const nonPath: Position[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const k = r * size + c;
      if (!pathSet.has(k)) nonPath.push({ row: r, col: c });
    }
  }
  const voidRatio = 0.25 + 0.06 * d; // 0.31 → 0.85
  const voidCount = Math.floor(nonPath.length * Math.min(0.9, voidRatio));
  const voids = sample(nonPath, voidCount, rng);
  for (const v of voids) {
    board.cells[idx(size, v)] = { type: "void" };
  }

  return {
    id: `seed-${seed}-d${d}`,
    difficulty: d,
    seed,
    board,
    optimalPathLength: path.length,
  };
}

/** Run randomWalk multiple times, return the best (longest path ≥ target, else longest overall). */
function bestRandomWalk(
  size: number,
  rng: () => number,
  target: number,
  attempts: number,
): Position[] {
  let best: Position[] = [];
  for (let i = 0; i < attempts; i++) {
    const start: Position = {
      row: Math.floor(rng() * size),
      col: Math.floor(rng() * size),
    };
    const p = randomWalk(size, start, rng, target * 2); // cap above target to avoid runaway
    if (p.length > best.length) best = p;
    if (best.length >= target) break;
  }
  if (best.length < 4) {
    // Fallback: a snake along the top two rows.
    best = [];
    for (let c = 0; c < size; c++) best.push({ row: 0, col: c });
    for (let c = size - 1; c >= 0; c--) best.push({ row: 1, col: c });
  }
  return best;
}

/** Self-avoiding random walk on a size×size grid starting at `start`, capped at `cap` cells. */
function randomWalk(size: number, start: Position, rng: () => number, cap: number): Position[] {
  const visited = new Set<number>();
  const path: Position[] = [start];
  visited.add(idx(size, start));
  let current = start;
  while (path.length < cap) {
    const nbrs = neighbors({ rows: size, cols: size }, current).filter(
      (n) => !visited.has(idx(size, n)),
    );
    if (nbrs.length === 0) break;
    shuffle(nbrs, rng);
    current = nbrs[0]!;
    path.push(current);
    visited.add(idx(size, current));
  }
  return path;
}

/**
 * Generate the daily puzzle for a given UTC date string (YYYY-MM-DD).
 * Difficulty cycles by day-of-week per game-spec.json#dailyPuzzle.
 */
export function generateDailyPuzzle(dateISO: string): Puzzle {
  const seed = dateToSeed(dateISO);
  const dow = new Date(dateISO + "T00:00:00Z").getUTCDay(); // 0=Sun
  const diffByDow = [6, 3, 4, 6, 5, 7, 8]; // Sun, Mon, ..., Sat
  const d = diffByDow[dow] ?? 5;
  return generatePuzzle(d, seed);
}

function dateToSeed(dateISO: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateISO.length; i++) {
    h ^= dateISO.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
