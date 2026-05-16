// Naked Pair — two cells in the same region whose candidates are
// EXACTLY the same 2-digit set. Those 2 digits cannot appear elsewhere
// in the region.
//
// Hidden Pair — two digits that are candidates for EXACTLY the same
// 2 cells in a region. Those 2 cells cannot hold any OTHER digit.
//
// Phase 2 ships only Naked Pair (sufficient for L2). Hidden Pair stays
// a stub returning null — Phase 2.5 fills it; until then a puzzle that
// strictly requires Hidden Pair drops to backtracking in solver.

import { BOARD_SIZE, BOX_SIZE } from '../constants';
import { popcount } from '../bitmask';
import { Technique, type Board, type CellPosition } from '../types';
import type { TechniqueFinder, TechniqueResult, CellElimination } from './types';

// Generate the 27 region position lists once at module load — used by
// every multi-cell technique.
type RegionCells = readonly { row: number; col: number }[];

function buildRegions(): { rows: RegionCells[]; cols: RegionCells[]; boxes: RegionCells[] } {
  const rows: RegionCells[] = [];
  const cols: RegionCells[] = [];
  const boxes: RegionCells[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    rows.push([...Array(BOARD_SIZE)].map((_, c) => ({ row: i, col: c })));
    cols.push([...Array(BOARD_SIZE)].map((_, r) => ({ row: r, col: i })));
    const br = Math.trunc(i / BOX_SIZE) * BOX_SIZE;
    const bc = (i % BOX_SIZE) * BOX_SIZE;
    const cells: { row: number; col: number }[] = [];
    for (let dr = 0; dr < BOX_SIZE; dr++) {
      for (let dc = 0; dc < BOX_SIZE; dc++) {
        cells.push({ row: br + dr, col: bc + dc });
      }
    }
    boxes.push(cells);
  }
  return { rows, cols, boxes };
}

const REGIONS = buildRegions();
const ALL_REGIONS: { type: string; cells: RegionCells }[] = [
  ...REGIONS.rows.map((cells, i) => ({ type: `row ${i + 1}`, cells })),
  ...REGIONS.cols.map((cells, i) => ({ type: `column ${i + 1}`, cells })),
  ...REGIONS.boxes.map((cells, i) => ({ type: `box ${i + 1}`, cells })),
];

export const findNakedPair: TechniqueFinder = (
  board: Board, candidates: Uint16Array,
): TechniqueResult | null => {
  for (const region of ALL_REGIONS) {
    // Find empty cells with exactly 2 candidates each.
    const twoCandCells: { pos: CellPosition; mask: number }[] = [];
    for (const p of region.cells) {
      if (board[p.row][p.col] != null) continue;
      const m = candidates[p.row * BOARD_SIZE + p.col];
      if (popcount(m) === 2) twoCandCells.push({ pos: p, mask: m });
    }
    // Look for a pair with the SAME mask.
    for (let i = 0; i < twoCandCells.length; i++) {
      for (let j = i + 1; j < twoCandCells.length; j++) {
        if (twoCandCells[i].mask !== twoCandCells[j].mask) continue;
        const pairMask = twoCandCells[i].mask;
        // Eliminate `pairMask` digits from every OTHER cell in the region.
        const elims: CellElimination[] = [];
        for (const p of region.cells) {
          if ((p.row === twoCandCells[i].pos.row && p.col === twoCandCells[i].pos.col) ||
              (p.row === twoCandCells[j].pos.row && p.col === twoCandCells[j].pos.col)) {
            continue;
          }
          if (board[p.row][p.col] != null) continue;
          const m = candidates[p.row * BOARD_SIZE + p.col];
          const overlap = m & pairMask;
          if (overlap === 0) continue;
          const removed: number[] = [];
          for (let d = 1; d <= 9; d++) {
            if (overlap & (1 << d)) removed.push(d);
          }
          if (removed.length) elims.push({ pos: p, values: removed });
        }
        if (elims.length === 0) continue; // pair found but no eliminations — skip
        const digits: number[] = [];
        for (let d = 1; d <= 9; d++) if (pairMask & (1 << d)) digits.push(d);
        return {
          technique: Technique.NAKED_PAIR,
          cells: [twoCandCells[i].pos, twoCandCells[j].pos],
          eliminations: elims,
          placements: [],
          reason: `Naked pair {${digits.join(',')}} in ${region.type} `
                + `eliminates from ${elims.length} other cell(s)`,
        };
      }
    }
  }
  return null;
};

// ── Stubs (Phase 2.5) ───────────────────────────────────────────────
// Returning null is the "I don't see it" signal — solver moves on to
// the next technique or falls back to backtracking. Stubs keep the
// TECHNIQUES_BY_DIFFICULTY registry complete so per-level config doesn't
// have to special-case "this one isn't implemented yet".

export const findHiddenPair: TechniqueFinder = () => null;
export const findNakedTriple: TechniqueFinder = () => null;
export const findHiddenTriple: TechniqueFinder = () => null;

export { ALL_REGIONS };
