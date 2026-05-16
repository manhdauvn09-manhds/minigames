// Naked Single + Hidden Single — the two cheapest techniques and the
// only ones strictly needed for Easy / Medium puzzles.
//
//   Naked Single — a cell has exactly one candidate left.
//   Hidden Single — a digit can only fit in one cell of a row/col/box.

import { BIT, popcount, lowestBit } from '../bitmask';
import { BOARD_SIZE, BOX_SIZE } from '../constants';
import { Technique, type Board } from '../types';
import type { TechniqueFinder, TechniqueResult } from './types';

export const findNakedSingle: TechniqueFinder = (
  board: Board, candidates: Uint16Array,
): TechniqueResult | null => {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] != null) continue;
      const m = candidates[r * BOARD_SIZE + c];
      if (popcount(m) === 1) {
        const v = lowestBit(m);
        return {
          technique: Technique.NAKED_SINGLE,
          cells: [{ row: r, col: c }],
          eliminations: [],
          placements: [{ pos: { row: r, col: c }, value: v }],
          reason: `Cell (${r + 1},${c + 1}) only allows ${v}`,
        };
      }
    }
  }
  return null;
};

export const findHiddenSingle: TechniqueFinder = (
  board: Board, candidates: Uint16Array,
): TechniqueResult | null => {
  // For each region (9 rows + 9 cols + 9 boxes) and each digit 1..9:
  // count how many empty cells in the region accept that digit. If
  // exactly one → hidden single.

  // Helper: scan a region's cell positions, find the first cell whose
  // candidate mask includes `digit`. If exactly one such cell, return it.
  function regionUniqueCellFor(
    digit: number, positions: readonly { row: number; col: number }[], regionLabel: string,
  ): TechniqueResult | null {
    let found: { row: number; col: number } | null = null;
    for (const p of positions) {
      if (board[p.row][p.col] != null) continue;
      if (candidates[p.row * BOARD_SIZE + p.col] & BIT[digit]) {
        if (found) return null; // 2+ candidates → no hidden single
        found = p;
      }
    }
    if (!found) return null;
    return {
      technique: Technique.HIDDEN_SINGLE,
      cells: [found],
      eliminations: [],
      placements: [{ pos: found, value: digit }],
      reason: `${digit} can only go in (${found.row + 1},${found.col + 1}) within ${regionLabel}`,
    };
  }

  // Build region position lists once, lazily cached.
  for (let i = 0; i < BOARD_SIZE; i++) {
    const rowCells = [...Array(BOARD_SIZE)].map((_, c) => ({ row: i, col: c }));
    const colCells = [...Array(BOARD_SIZE)].map((_, r) => ({ row: r, col: i }));
    const br = Math.trunc(i / BOX_SIZE) * BOX_SIZE;
    const bc = (i % BOX_SIZE) * BOX_SIZE;
    const boxCells: { row: number; col: number }[] = [];
    for (let dr = 0; dr < BOX_SIZE; dr++) {
      for (let dc = 0; dc < BOX_SIZE; dc++) {
        boxCells.push({ row: br + dr, col: bc + dc });
      }
    }
    for (let d = 1; d <= 9; d++) {
      const r1 = regionUniqueCellFor(d, rowCells, `row ${i + 1}`);
      if (r1) return r1;
      const r2 = regionUniqueCellFor(d, colCells, `column ${i + 1}`);
      if (r2) return r2;
      const r3 = regionUniqueCellFor(d, boxCells, `box ${i + 1}`);
      if (r3) return r3;
    }
  }
  return null;
};

