// Puzzle generator.
//
// Strategy:
//   1. Build a complete valid solution (fast — randomised backtracking
//      with shuffled candidate order).
//   2. Pick a random cell-removal order (Fisher-Yates of 81 indices).
//   3. For each index in order, tentatively clear that cell:
//      - countSolutions(board, 2) — must stay at 1 (uniqueness).
//      - solveWithTechniques(board, maxLevel) — must still solve with
//        techniques up to the difficulty's maxTechnique.
//      If both pass, keep the removal; else restore the digit.
//   4. Stop when clue count drops into the difficulty's clue range.
//
// Determinism: the same `seed` always produces the same `Puzzle`.
// Multiplayer Race mode (Phase 7B) negotiates a single seed; both
// browsers run this generator independently and get identical puzzles.

import { BIT } from './bitmask';
import { BOARD_SIZE, BOX_SIZE, DIFFICULTY_CONFIG } from './constants';
import { mulberry32, type Rng } from './random';
import { cloneBoard, emptyBoard } from './validator';
import { countSolutions, solveWithTechniques } from './solver';
import { TECHNIQUES_BY_DIFFICULTY } from './techniques';
import type { Board, DifficultyLevel, Puzzle, Technique } from './types';

/** Build a complete (all 81 cells filled, valid) Sudoku solution.
 *
 * Randomised backtracking — at each cell tries digits 1..9 in a shuffled
 * order. With propagation + MRV elsewhere this is overkill, but the
 * shuffle ensures we cover the full solution space across seeds. */
export function generateFullSolution(seed?: number | string): Board {
  const rng = mulberry32(seed ?? Date.now());
  const board = emptyBoard();
  if (!fillRecurse(board, 0, rng)) {
    throw new Error('generateFullSolution: backtracking failed (impossible)');
  }
  return board;
}

function fillRecurse(board: Board, idx: number, rng: Rng): boolean {
  if (idx === 81) return true;
  const r = Math.trunc(idx / 9);
  const c = idx % 9;
  if (board[r][c] != null) return fillRecurse(board, idx + 1, rng);

  const cand = candidatesQuick(board, r, c);
  // Try digits in random order — shuffles which subtree we explore
  // first, so a single seed visits very different solutions vs `Date.now`.
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (cand & BIT[d]) digits.push(d);
  rng.shuffle(digits);

  for (const v of digits) {
    board[r][c] = v as any;
    if (fillRecurse(board, idx + 1, rng)) return true;
    board[r][c] = null;
  }
  return false;
}

function candidatesQuick(board: Board, r: number, c: number): number {
  let row = 0, col = 0, box = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const a = board[r][i]; if (a != null) row |= BIT[a];
    const b = board[i][c]; if (b != null) col |= BIT[b];
  }
  const br = Math.trunc(r / BOX_SIZE) * BOX_SIZE;
  const bc = Math.trunc(c / BOX_SIZE) * BOX_SIZE;
  for (let dr = 0; dr < BOX_SIZE; dr++) {
    for (let dc = 0; dc < BOX_SIZE; dc++) {
      const v = board[br + dr][bc + dc];
      if (v != null) box |= BIT[v];
    }
  }
  return 0b1111111110 & ~(row | col | box);
}

/** Generate a puzzle of the given difficulty level. */
export function generatePuzzle(
  level: DifficultyLevel,
  seed?: number | string,
): Puzzle {
  const cfg = DIFFICULTY_CONFIG[level];
  const seedStr = seed != null ? String(seed) : `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rng = mulberry32(seedStr);

  const solution = generateFullSolution(seedStr);
  const board = cloneBoard(solution);

  // Cell removal order — random permutation of 0..80.
  const order: number[] = [];
  for (let i = 0; i < 81; i++) order.push(i);
  rng.shuffle(order);

  let clues = 81;
  let hardestSeen: Technique | null = null;

  for (const idx of order) {
    if (clues <= cfg.clueRange.min) break;
    const r = Math.trunc(idx / 9);
    const c = idx % 9;
    const original = board[r][c];
    if (original == null) continue;

    // Tentatively remove.
    board[r][c] = null;

    // Uniqueness check (must remain solvable to exactly 1 solution).
    const n = countSolutions(board, 2);
    if (n !== 1) {
      board[r][c] = original;
      continue;
    }

    // Technique-solvability check (must solve with allowed techniques).
    const trace = solveWithTechniques(board, level);
    if (!trace.solved) {
      board[r][c] = original;
      continue;
    }
    // Reject if a technique HARDER than allowed was used (defence in
    // depth — solveWithTechniques already filters but track hardest
    // for the puzzle metadata).
    if (trace.hardestTechnique != null) {
      const rank = TECHNIQUES_BY_DIFFICULTY.findIndex((t) => t.id === trace.hardestTechnique);
      const cap  = TECHNIQUES_BY_DIFFICULTY.findIndex((t) => t.id === cfg.maxTechnique);
      if (rank > cap) {
        board[r][c] = original;
        continue;
      }
      if (
        hardestSeen == null ||
        TECHNIQUES_BY_DIFFICULTY.findIndex((t) => t.id === trace.hardestTechnique) >
        TECHNIQUES_BY_DIFFICULTY.findIndex((t) => t.id === hardestSeen)
      ) {
        hardestSeen = trace.hardestTechnique;
      }
    }

    clues -= 1;
  }

  return {
    initialBoard: cloneBoard(board),
    solution,
    difficulty: level,
    hardestTechnique: hardestSeen ?? cfg.maxTechnique,
    seed: seedStr,
    generatedAt: new Date().toISOString(),
  };
}

