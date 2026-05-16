// X-Wing — for digit `d`: find 2 rows where `d` appears in EXACTLY 2
// candidate cells, and those 4 cells form a rectangle (same 2 columns).
// Then `d` cannot appear elsewhere in those 2 columns.
//
// Symmetric for the column-based form (2 cols → eliminate from rows).
//
// Phase 2 ships X-Wing (covers L4). Swordfish stub.

import { BIT } from '../bitmask';
import { BOARD_SIZE } from '../constants';
import { Technique, type Board, type CellPosition } from '../types';
import type { TechniqueFinder, TechniqueResult, CellElimination } from './types';

export const findXWing: TechniqueFinder = (
  board: Board, candidates: Uint16Array,
): TechniqueResult | null => {
  // Row-based form
  for (let d = 1; d <= 9; d++) {
    const rowCols: { row: number; cols: number[] }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const cols: number[] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] == null && (candidates[r * BOARD_SIZE + c] & BIT[d])) {
          cols.push(c);
        }
      }
      if (cols.length === 2) rowCols.push({ row: r, cols });
    }
    for (let i = 0; i < rowCols.length; i++) {
      for (let j = i + 1; j < rowCols.length; j++) {
        const a = rowCols[i], b = rowCols[j];
        if (a.cols[0] !== b.cols[0] || a.cols[1] !== b.cols[1]) continue;
        // Found X-Wing on rows {a.row, b.row} × cols {a.cols[0], a.cols[1]}.
        // Eliminate `d` from those 2 columns elsewhere.
        const elims: CellElimination[] = [];
        for (const col of a.cols) {
          for (let r = 0; r < BOARD_SIZE; r++) {
            if (r === a.row || r === b.row) continue;
            if (board[r][col] != null) continue;
            if (candidates[r * BOARD_SIZE + col] & BIT[d]) {
              elims.push({ pos: { row: r, col }, values: [d] });
            }
          }
        }
        if (elims.length) {
          const cells: CellPosition[] = [
            { row: a.row, col: a.cols[0] }, { row: a.row, col: a.cols[1] },
            { row: b.row, col: a.cols[0] }, { row: b.row, col: a.cols[1] },
          ];
          return {
            technique: Technique.X_WING,
            cells, eliminations: elims, placements: [],
            reason: `X-Wing on digit ${d}: rows ${a.row + 1},${b.row + 1} × `
                  + `cols ${a.cols[0] + 1},${a.cols[1] + 1}`,
          };
        }
      }
    }
  }

  // Column-based form (mirror of above)
  for (let d = 1; d <= 9; d++) {
    const colRows: { col: number; rows: number[] }[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const rows: number[] = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (board[r][c] == null && (candidates[r * BOARD_SIZE + c] & BIT[d])) {
          rows.push(r);
        }
      }
      if (rows.length === 2) colRows.push({ col: c, rows });
    }
    for (let i = 0; i < colRows.length; i++) {
      for (let j = i + 1; j < colRows.length; j++) {
        const a = colRows[i], b = colRows[j];
        if (a.rows[0] !== b.rows[0] || a.rows[1] !== b.rows[1]) continue;
        const elims: CellElimination[] = [];
        for (const row of a.rows) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (c === a.col || c === b.col) continue;
            if (board[row][c] != null) continue;
            if (candidates[row * BOARD_SIZE + c] & BIT[d]) {
              elims.push({ pos: { row, col: c }, values: [d] });
            }
          }
        }
        if (elims.length) {
          const cells: CellPosition[] = [
            { row: a.rows[0], col: a.col }, { row: a.rows[1], col: a.col },
            { row: a.rows[0], col: b.col }, { row: a.rows[1], col: b.col },
          ];
          return {
            technique: Technique.X_WING,
            cells, eliminations: elims, placements: [],
            reason: `X-Wing on digit ${d}: cols ${a.col + 1},${b.col + 1} × `
                  + `rows ${a.rows[0] + 1},${a.rows[1] + 1}`,
          };
        }
      }
    }
  }
  return null;
};

// Stub (Phase 2.5).
export const findSwordfish: TechniqueFinder = () => null;
