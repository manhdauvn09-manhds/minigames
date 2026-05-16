// Pointing Pair / Pointing Triple — when a digit's only candidates in a
// box all share a single row (or col), that digit is locked to that row
// portion of the box → can be eliminated from the rest of the row (or col)
// outside the box.
//
// Box-Line Reduction is the dual: when a digit's only candidates in a
// row (or col) all sit in one box, it's locked → eliminate from the rest
// of the box.
//
// Phase 2 ships Pointing Pair (covers L3). Box-Line Reduction stub.

import { BIT } from '../bitmask';
import { BOARD_SIZE, BOX_SIZE } from '../constants';
import { Technique, type Board, type CellPosition } from '../types';
import type { TechniqueFinder, TechniqueResult, CellElimination } from './types';

export const findPointingPair: TechniqueFinder = (
  board: Board, candidates: Uint16Array,
): TechniqueResult | null => {
  // For each box (0..8), for each digit (1..9): collect candidate cells.
  // If 2 or 3 cells share the same row (or col), eliminate from the rest
  // of that row (or col) outside the box.

  for (let bi = 0; bi < BOARD_SIZE; bi++) {
    const br = Math.trunc(bi / BOX_SIZE) * BOX_SIZE;
    const bc = (bi % BOX_SIZE) * BOX_SIZE;

    for (let d = 1; d <= 9; d++) {
      const cells: CellPosition[] = [];
      for (let dr = 0; dr < BOX_SIZE; dr++) {
        for (let dc = 0; dc < BOX_SIZE; dc++) {
          const r = br + dr, c = bc + dc;
          if (board[r][c] != null) continue;
          if (candidates[r * BOARD_SIZE + c] & BIT[d]) {
            cells.push({ row: r, col: c });
          }
        }
      }
      if (cells.length < 2 || cells.length > 3) continue;

      // Same row?
      const allSameRow = cells.every((p) => p.row === cells[0].row);
      if (allSameRow) {
        const elims = collectRowElims(board, candidates, cells[0].row, bc, d);
        if (elims.length) {
          return {
            technique: Technique.POINTING_PAIR,
            cells,
            eliminations: elims,
            placements: [],
            reason: `Digit ${d} in box ${bi + 1} is locked to row ${cells[0].row + 1}`,
          };
        }
      }
      // Same column?
      const allSameCol = cells.every((p) => p.col === cells[0].col);
      if (allSameCol) {
        const elims = collectColElims(board, candidates, cells[0].col, br, d);
        if (elims.length) {
          return {
            technique: Technique.POINTING_PAIR,
            cells,
            eliminations: elims,
            placements: [],
            reason: `Digit ${d} in box ${bi + 1} is locked to column ${cells[0].col + 1}`,
          };
        }
      }
    }
  }
  return null;
};

function collectRowElims(
  board: Board, candidates: Uint16Array,
  row: number, boxColStart: number, digit: number,
): CellElimination[] {
  const out: CellElimination[] = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (c >= boxColStart && c < boxColStart + BOX_SIZE) continue;
    if (board[row][c] != null) continue;
    if (candidates[row * BOARD_SIZE + c] & BIT[digit]) {
      out.push({ pos: { row, col: c }, values: [digit] });
    }
  }
  return out;
}

function collectColElims(
  board: Board, candidates: Uint16Array,
  col: number, boxRowStart: number, digit: number,
): CellElimination[] {
  const out: CellElimination[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (r >= boxRowStart && r < boxRowStart + BOX_SIZE) continue;
    if (board[r][col] != null) continue;
    if (candidates[r * BOARD_SIZE + col] & BIT[digit]) {
      out.push({ pos: { row: r, col }, values: [digit] });
    }
  }
  return out;
}

// Stub (Phase 2.5).
export const findBoxLineReduction: TechniqueFinder = () => null;
