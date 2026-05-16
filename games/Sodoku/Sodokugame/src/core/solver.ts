// Solver — three modes:
//
// 1. solveWithTechniques(board) — apply techniques iteratively until no
//    one fires. Returns whether the board got solved AND the trace of
//    steps taken (for the hint system + for the generator's "is this
//    puzzle solvable purely by L<n> techniques?" check).
//
// 2. solveWithBacktracking(board) — fast brute-force fallback. Uses
//    constraint propagation (forced singles) before each branch + MRV
//    (pick the cell with fewest candidates) to prune the search tree.
//    Returns the solved board, or null if unsolvable / contradictory.
//
// 3. countSolutions(board, limit=2) — like (2) but counts the first
//    `limit` solutions. The generator calls this with limit=2 and
//    accepts a removal only when the count stays at 1 (uniqueness).
//
// 4. getNextSolveStep(board, notes) — wrapper for the hint UI.
//
// All four operate on Board (the JSON-friendly representation) at the
// API surface and convert in/out of bitmask repr internally.

import { BIT, popcount, lowestBit, maskPlace, regionMasksFromBoard } from './bitmask';
import { BOARD_SIZE, BOX_SIZE } from './constants';
import {
  cloneBoard, computeAllCandidatesMask, getPeers, isBoardComplete,
} from './validator';
import type { Board, CellPosition, Technique } from './types';
import { TECHNIQUES_BY_DIFFICULTY, techniquesUpToLevel } from './techniques';
import type { TechniqueResult } from './techniques/types';

export interface SolveTraceStep {
  technique: Technique;
  cells: CellPosition[];
  placements: { pos: CellPosition; value: number }[];
  eliminations: { pos: CellPosition; values: number[] }[];
  reason: string;
}

export interface SolveResult {
  solved: boolean;
  board: Board;            // mutated copy (input not touched)
  steps: SolveTraceStep[];
  hardestTechnique: Technique | null;
}

/** Iterate the technique chain until either the board is solved or no
 * technique fires. The board is always returned (possibly partially
 * filled) so callers can chain into backtracking if needed.
 *
 * Maintains the candidates Uint16Array as PERSISTENT state across
 * iterations: placements clear the cell + remove the value from peer
 * candidate sets; eliminations clear bits directly. Without this,
 * elimination-only techniques (NakedPair, PointingPair, X-Wing,
 * XY-Wing) would re-fire forever — `result.eliminations` would never
 * actually shrink the board, so `find()` keeps returning the same
 * pattern. The earlier version recomputed candidates from the board
 * each loop and hung Level 3+ generation until the V8 heap exploded. */
export function solveWithTechniques(
  inputBoard: Board,
  maxLevel: 1 | 2 | 3 | 4 | 5 = 5,
): SolveResult {
  const board = cloneBoard(inputBoard);
  const allowed = techniquesUpToLevel(maxLevel);
  const steps: SolveTraceStep[] = [];
  let hardest: Technique | null = null;

  // Difficulty rank for "hardest technique seen" — higher index = harder.
  const rank: Record<Technique, number> = {} as any;
  TECHNIQUES_BY_DIFFICULTY.forEach((t, i) => { rank[t.id] = i; });

  // Persistent state.
  const masks = regionMasksFromBoard(board);
  const candidates = computeAllCandidatesMask(board);

  while (!isBoardComplete(board)) {
    let result: TechniqueResult | null = null;
    for (const t of allowed) {
      result = t.find(board, candidates);
      if (result) {
        if (hardest == null || rank[result.technique] > rank[hardest]) {
          hardest = result.technique;
        }
        break;
      }
    }
    if (!result) break; // chain exhausted

    // Apply placements: write to board, update region masks, zero out
    // the placed cell's candidate set, and clear `value`'s bit from
    // every peer's candidate set.
    for (const p of result.placements) {
      const v = p.value;
      const r = p.pos.row, c = p.pos.col;
      board[r][c] = v as any;
      maskPlace(masks, r, c, v);
      candidates[r * BOARD_SIZE + c] = 0;
      const bit = ~BIT[v];
      for (const peer of getPeers(r, c)) {
        candidates[peer.row * BOARD_SIZE + peer.col] &= bit;
      }
    }

    // Apply eliminations: clear the requested digit bits from each
    // cell's candidate set. This is what makes the elimination-only
    // techniques actually progressive — without it the chain re-fires
    // the same pattern indefinitely.
    for (const elim of result.eliminations) {
      let bits = 0;
      for (const v of elim.values) bits |= BIT[v];
      candidates[elim.pos.row * BOARD_SIZE + elim.pos.col] &= ~bits;
    }

    steps.push({
      technique: result.technique,
      cells: result.cells,
      placements: result.placements,
      eliminations: result.eliminations,
      reason: result.reason,
    });
  }

  return {
    solved: isBoardComplete(board),
    board,
    steps,
    hardestTechnique: hardest,
  };
}

/** Brute-force solver. Returns a single solved board, or null. Uses
 * forced-single propagation + MRV cell selection. */
export function solveWithBacktracking(inputBoard: Board): Board | null {
  const board = cloneBoard(inputBoard);
  // Build region masks once.
  const rowM = new Uint16Array(BOARD_SIZE);
  const colM = new Uint16Array(BOARD_SIZE);
  const boxM = new Uint16Array(BOARD_SIZE);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (v != null) {
        const b = BIT[v];
        rowM[r] |= b;
        colM[c] |= b;
        boxM[boxIdxQuick(r, c)] |= b;
      }
    }
  }
  return backtrack(board, rowM, colM, boxM) ? board : null;
}

/** Count up to `limit` solutions. Used by the generator for uniqueness
 * checks (limit=2: stop early at 2). Returns the actual count
 * (capped). */
export function countSolutions(inputBoard: Board, limit: number = 2): number {
  const board = cloneBoard(inputBoard);
  const rowM = new Uint16Array(BOARD_SIZE);
  const colM = new Uint16Array(BOARD_SIZE);
  const boxM = new Uint16Array(BOARD_SIZE);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (v != null) {
        const b = BIT[v];
        rowM[r] |= b;
        colM[c] |= b;
        boxM[boxIdxQuick(r, c)] |= b;
      }
    }
  }
  return countBacktrack(board, rowM, colM, boxM, limit, 0);
}

/** Wrap the technique chain for the hint UI — returns the next single
 * actionable step (single placement or elimination set) without applying it. */
export function getNextSolveStep(
  board: Board,
  maxLevel: 1 | 2 | 3 | 4 | 5 = 5,
): TechniqueResult | null {
  const candidates = computeAllCandidatesMask(board);
  for (const t of techniquesUpToLevel(maxLevel)) {
    const r = t.find(board, candidates);
    if (r) return r;
  }
  return null;
}

// ── Backtracking implementation ─────────────────────────────────────
// `boxIdxQuick` is inlined for the hot loop. Same math as
// bitmask.boxIdx but no function call overhead.

function boxIdxQuick(r: number, c: number): number {
  return Math.trunc(r / BOX_SIZE) * BOX_SIZE + Math.trunc(c / BOX_SIZE);
}

const ALL = 0b1111111110;

/** Single-solution backtracker. Returns true on success (board mutated
 * in place). Uses MRV + propagation.
 *
 * IMPORTANT: any cell placed by the propagation pass (step 1) MUST be
 * tracked + unwound if every branch of the recursive call fails. The
 * earlier version omitted that, leaving phantom placements behind and
 * making the parent's subsequent branches see contradictions on a
 * board it never modified — all hard puzzles (e.g. Inkala) returned
 * null. countBacktrack got this right; this matches that pattern. */
function backtrack(
  board: Board, rowM: Uint16Array, colM: Uint16Array, boxM: Uint16Array,
): boolean {
  // 1. Propagate forced singles until none remain (or contradiction).
  // Track every placement so we can unwind on failure.
  const undos: { r: number; c: number; v: number }[] = [];
  while (true) {
    let placed = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] != null) continue;
        const cand = ALL & ~(rowM[r] | colM[c] | boxM[boxIdxQuick(r, c)]);
        if (cand === 0) {
          undoAll(board, rowM, colM, boxM, undos);
          return false; // contradiction
        }
        if (popcount(cand) === 1) {
          const v = lowestBit(cand);
          board[r][c] = v as any;
          const b = BIT[v];
          rowM[r] |= b;
          colM[c] |= b;
          boxM[boxIdxQuick(r, c)] |= b;
          undos.push({ r, c, v });
          placed = true;
        }
      }
    }
    if (!placed) break;
  }

  // 2. MRV: find the empty cell with fewest candidates.
  let bestR = -1, bestC = -1, bestCand = 0, bestCount = 10;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] != null) continue;
      const cand = ALL & ~(rowM[r] | colM[c] | boxM[boxIdxQuick(r, c)]);
      const n = popcount(cand);
      if (n < bestCount) {
        bestCount = n;
        bestR = r; bestC = c; bestCand = cand;
        if (n <= 1) break;
      }
    }
    if (bestCount <= 1) break;
  }
  if (bestR === -1) return true; // fully solved (propagation undos kept)

  // 3. Branch on each candidate of the chosen cell.
  let m = bestCand;
  while (m) {
    const v = lowestBit(m);
    const b = BIT[v];
    board[bestR][bestC] = v as any;
    rowM[bestR] |= b;
    colM[bestC] |= b;
    boxM[boxIdxQuick(bestR, bestC)] |= b;
    if (backtrack(board, rowM, colM, boxM)) return true;
    // Branch failed — unwind the picked cell only; undos stay in scope.
    board[bestR][bestC] = null;
    rowM[bestR] &= ~b;
    colM[bestC] &= ~b;
    boxM[boxIdxQuick(bestR, bestC)] &= ~b;
    m &= m - 1;
  }
  // All branches dead — undo the propagation placements before bubbling
  // failure to the caller.
  undoAll(board, rowM, colM, boxM, undos);
  return false;
}

function undoAll(
  board: Board, rowM: Uint16Array, colM: Uint16Array, boxM: Uint16Array,
  undos: { r: number; c: number; v: number }[],
): void {
  for (let i = undos.length - 1; i >= 0; i--) {
    const u = undos[i];
    board[u.r][u.c] = null;
    const b = BIT[u.v];
    rowM[u.r] &= ~b;
    colM[u.c] &= ~b;
    boxM[boxIdxQuick(u.r, u.c)] &= ~b;
  }
}

/** Count up to `limit` solutions via backtracking. Returns running
 * count; recursion bails out as soon as `count >= limit`. */
function countBacktrack(
  board: Board, rowM: Uint16Array, colM: Uint16Array, boxM: Uint16Array,
  limit: number, count: number,
): number {
  if (count >= limit) return count;

  // Propagate forced singles until none remain.
  // Track local placements so we can undo at the end of this branch.
  const undos: { r: number; c: number; v: number }[] = [];
  while (true) {
    let placed = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] != null) continue;
        const cand = ALL & ~(rowM[r] | colM[c] | boxM[boxIdxQuick(r, c)]);
        if (cand === 0) {
          // Contradiction: undo our local placements + return current count.
          for (let i = undos.length - 1; i >= 0; i--) {
            const u = undos[i];
            board[u.r][u.c] = null;
            const b = BIT[u.v];
            rowM[u.r] &= ~b;
            colM[u.c] &= ~b;
            boxM[boxIdxQuick(u.r, u.c)] &= ~b;
          }
          return count;
        }
        if (popcount(cand) === 1) {
          const v = lowestBit(cand);
          board[r][c] = v as any;
          const b = BIT[v];
          rowM[r] |= b;
          colM[c] |= b;
          boxM[boxIdxQuick(r, c)] |= b;
          undos.push({ r, c, v });
          placed = true;
        }
      }
    }
    if (!placed) break;
  }

  // MRV pick.
  let bestR = -1, bestC = -1, bestCand = 0, bestCount = 10;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] != null) continue;
      const cand = ALL & ~(rowM[r] | colM[c] | boxM[boxIdxQuick(r, c)]);
      const n = popcount(cand);
      if (n < bestCount) {
        bestCount = n;
        bestR = r; bestC = c; bestCand = cand;
        if (n <= 1) break;
      }
    }
    if (bestCount <= 1) break;
  }

  if (bestR === -1) {
    count += 1;
    // Undo propagation before returning.
    for (let i = undos.length - 1; i >= 0; i--) {
      const u = undos[i];
      board[u.r][u.c] = null;
      const b = BIT[u.v];
      rowM[u.r] &= ~b;
      colM[u.c] &= ~b;
      boxM[boxIdxQuick(u.r, u.c)] &= ~b;
    }
    return count;
  }

  let m = bestCand;
  while (m && count < limit) {
    const v = lowestBit(m);
    const b = BIT[v];
    board[bestR][bestC] = v as any;
    rowM[bestR] |= b;
    colM[bestC] |= b;
    boxM[boxIdxQuick(bestR, bestC)] |= b;
    count = countBacktrack(board, rowM, colM, boxM, limit, count);
    board[bestR][bestC] = null;
    rowM[bestR] &= ~b;
    colM[bestC] &= ~b;
    boxM[boxIdxQuick(bestR, bestC)] &= ~b;
    m &= m - 1;
  }

  // Undo propagation before returning.
  for (let i = undos.length - 1; i >= 0; i--) {
    const u = undos[i];
    board[u.r][u.c] = null;
    const b = BIT[u.v];
    rowM[u.r] &= ~b;
    colM[u.c] &= ~b;
    boxM[boxIdxQuick(u.r, u.c)] &= ~b;
  }
  return count;
}
