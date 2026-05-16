/* ============================================================================
 * AI shared utilities -- pattern scoring, candidate move generation.
 * ----------------------------------------------------------------------------
 * The scoring model is "run length + open ends":
 *
 *   Counting each maximal run of `player` stones once, score it by how
 *   long it is and whether the cells immediately before / after it are
 *   empty (open) or blocked (opponent / off-board).
 *
 *     len 5            -> WIN       (10_000_000)
 *     len 4 open       -> 100_000   (one more move wins)
 *     len 4 half-open  -> 10_000
 *     len 4 closed     -> 0         (cannot extend to 5)
 *     len 3 open       -> 1_000     (.XXX.  -- becomes open-4 next turn)
 *     len 3 half-open  -> 100
 *     len 3 closed     -> 0
 *     len 2 open       -> 100
 *     len 2 half-open  -> 10
 *     len 1 open       -> 10
 *     len 1 half-open  -> 1
 *
 * This is not an "expert" heuristic (no VCF, no double-threat recognition)
 * but is monotone and good enough to carry levels 2 + 3 to clearly
 * stronger play than level 1. Level 5 in PHASE 5 will replace this with
 * a richer window-classifier + threat search.
 * ============================================================================ */

import { idxOf, BLACK, WHITE, EMPTY } from '../game/coords.js';

const DIRS = [
  [0, 1],   // horizontal  →
  [1, 0],   // vertical    ↓
  [1, 1],   // diagonal    ↘
  [1, -1],  // anti-diag   ↙
];

/** Weight table keyed by [len][openEnds]. length 5+ collapses to the
 *  WIN slot regardless of open-ends (it's over by then). */
const RUN_SCORES = [
  [0,       0,       0],       // len 0 -- unused sentinel
  [0,       1,       10],      // len 1: closed, half, open
  [0,       10,      100],     // len 2
  [0,       100,     1_000],   // len 3
  [0,       10_000,  100_000], // len 4
];
const WIN_SCORE = 10_000_000;

/** Score a single run. `openEnds` ∈ {0, 1, 2}. */
function runScore(len, openEnds) {
  if (len >= 5) return WIN_SCORE;
  const row = RUN_SCORES[len];
  return row ? row[openEnds] : 0;
}

/** Full-board score from `player`'s perspective: sum of all their runs.
 *  Uses a "scan only leftmost stone of each run" trick so each run is
 *  counted exactly once per direction. */
export function scorePlayer(cells, size, player) {
  let total = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[idxOf(r, c, size)] !== player) continue;
      for (const [dr, dc] of DIRS) {
        // Skip unless (r, c) is the leftmost / topmost stone of its run.
        const pr = r - dr, pc = c - dc;
        if (pr >= 0 && pr < size && pc >= 0 && pc < size &&
            cells[idxOf(pr, pc, size)] === player) continue;
        // Walk forward to find run length.
        let len = 0, rr = r, cc = c;
        while (rr >= 0 && rr < size && cc >= 0 && cc < size &&
               cells[idxOf(rr, cc, size)] === player) {
          len++;
          rr += dr; cc += dc;
        }
        // Count open ends.
        let open = 0;
        // Left end (the cell before the run start)
        if (pr >= 0 && pr < size && pc >= 0 && pc < size &&
            cells[idxOf(pr, pc, size)] === EMPTY) open++;
        // Right end (the cell after the run ends)
        if (rr >= 0 && rr < size && cc >= 0 && cc < size &&
            cells[idxOf(rr, cc, size)] === EMPTY) open++;
        total += runScore(len, open);
      }
    }
  }
  return total;
}

/** Whole-board eval from `botColor`'s perspective. Defence slightly
 *  over-weighted so the bot prefers blocking a human threat of equal
 *  score to creating its own (humans miss attack chances, miss defence
 *  never does). */
export function evaluate(cells, size, botColor) {
  const humanColor = botColor === BLACK ? WHITE : BLACK;
  return scorePlayer(cells, size, botColor)
       - scorePlayer(cells, size, humanColor) * 1.05;
}

/** Hypothetically place `player` at (r,c) and return a "move pressure"
 *  score = sum over 4 directions of the local run created. Used by the
 *  single-move rule-based eval (levels 1-2) so we never have to do a
 *  full board scan per candidate. */
export function evalPlaceMove(cells, size, r, c, player) {
  const idx = idxOf(r, c, size);
  if (cells[idx] !== EMPTY) return -Infinity;
  cells[idx] = player;
  let score = 0;
  for (const [dr, dc] of DIRS) {
    // Walk back from (r, c) to find run start.
    let rs = r, cs = c;
    while (true) {
      const nr = rs - dr, nc = cs - dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
      if (cells[idxOf(nr, nc, size)] !== player) break;
      rs = nr; cs = nc;
    }
    // Count run length forward from (rs, cs).
    let len = 0, rr = rs, cc = cs;
    while (rr >= 0 && rr < size && cc >= 0 && cc < size &&
           cells[idxOf(rr, cc, size)] === player) {
      len++;
      rr += dr; cc += dc;
    }
    // Open ends
    let open = 0;
    const pr = rs - dr, pc = cs - dc;
    if (pr >= 0 && pr < size && pc >= 0 && pc < size &&
        cells[idxOf(pr, pc, size)] === EMPTY) open++;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size &&
        cells[idxOf(rr, cc, size)] === EMPTY) open++;
    score += runScore(len, open);
  }
  cells[idx] = EMPTY;
  return score;
}

/** Radius-N candidate generation. Returns a Set of idx values limited to
 *  empty cells within `radius` of any existing stone. For an empty board
 *  returns the centre cell only.
 *
 *  Radius defaults to 2, which is the standard Gomoku branching cap:
 *  outside this distance new stones are effectively disconnected from
 *  the position and cannot threaten or defend existing runs. */
export function candidates(cells, size, radius = 2) {
  const set = new Set();
  let anyStone = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[idxOf(r, c, size)] === EMPTY) continue;
      anyStone = true;
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
          if (cells[idxOf(nr, nc, size)] !== EMPTY) continue;
          set.add(idxOf(nr, nc, size));
        }
      }
    }
  }
  if (!anyStone) {
    // Empty board -- always open at the centre.
    set.add(idxOf(Math.floor(size / 2), Math.floor(size / 2), size));
  }
  return set;
}

export { WIN_SCORE };
