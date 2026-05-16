// XY-Wing — three bivalue cells (each with exactly 2 candidates):
//   - pivot {x, y}
//   - wing A {x, z} (peer of pivot)
//   - wing B {y, z} (peer of pivot)
// Then any cell that's a peer of BOTH wings cannot contain z.
//
// (Whatever value the pivot takes, one of the wings becomes z.)

import { BIT, popcount, lowestBit } from '../bitmask';
import { BOARD_SIZE } from '../constants';
import { Technique, type Board } from '../types';
import { getPeers } from '../validator';
import type { TechniqueFinder, TechniqueResult, CellElimination } from './types';

interface BivalueCell {
  row: number;
  col: number;
  mask: number;
  digits: [number, number];
}

export const findXYWing: TechniqueFinder = (
  board: Board, candidates: Uint16Array,
): TechniqueResult | null => {
  // Collect every empty cell with exactly 2 candidates.
  const bivalues: BivalueCell[] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] != null) continue;
      const m = candidates[r * BOARD_SIZE + c];
      if (popcount(m) !== 2) continue;
      const lo = lowestBit(m);
      const hi = lowestBit(m & ~BIT[lo]);
      bivalues.push({ row: r, col: c, mask: m, digits: [lo, hi] });
    }
  }

  // For each pivot, look at its bivalue peers; pair them up.
  for (const pivot of bivalues) {
    const peerKeys = new Set(getPeers(pivot.row, pivot.col).map((p) => p.row * 9 + p.col));
    const pivotPeers = bivalues.filter(
      (b) => b !== pivot && peerKeys.has(b.row * 9 + b.col),
    );
    for (let i = 0; i < pivotPeers.length; i++) {
      for (let j = i + 1; j < pivotPeers.length; j++) {
        const a = pivotPeers[i], b = pivotPeers[j];
        // Pivot {x, y}, wing A must share exactly one digit with pivot
        // and one with wing B; same for wing B; the third digit `z`
        // must be the one wing A and wing B share.
        const pivotXY = pivot.mask;
        const aMask = a.mask, bMask = b.mask;
        const z = aMask & bMask & ~pivotXY;
        if (popcount(z) !== 1) continue;
        // Wing A must share exactly 1 digit with pivot (besides z).
        if (popcount(aMask & pivotXY) !== 1) continue;
        if (popcount(bMask & pivotXY) !== 1) continue;
        // The "x" wing A shares with pivot must differ from the "y"
        // wing B shares with pivot (else pivot reduces to 1 digit).
        if ((aMask & pivotXY) === (bMask & pivotXY)) continue;

        const zDigit = lowestBit(z);

        // Eliminate `zDigit` from every empty cell that is peer of BOTH
        // wings (and is NOT the pivot itself).
        const aPeerKeys = new Set(getPeers(a.row, a.col).map((p) => p.row * 9 + p.col));
        const bPeerKeys = new Set(getPeers(b.row, b.col).map((p) => p.row * 9 + p.col));
        const elims: CellElimination[] = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] != null) continue;
            if (r === pivot.row && c === pivot.col) continue;
            if (r === a.row && c === a.col) continue;
            if (r === b.row && c === b.col) continue;
            const k = r * 9 + c;
            if (!aPeerKeys.has(k) || !bPeerKeys.has(k)) continue;
            if (candidates[r * BOARD_SIZE + c] & BIT[zDigit]) {
              elims.push({ pos: { row: r, col: c }, values: [zDigit] });
            }
          }
        }
        if (elims.length) {
          return {
            technique: Technique.XY_WING,
            cells: [
              { row: pivot.row, col: pivot.col },
              { row: a.row, col: a.col },
              { row: b.row, col: b.col },
            ],
            eliminations: elims,
            placements: [],
            reason: `XY-Wing pivot (${pivot.row + 1},${pivot.col + 1}) → `
                  + `eliminates ${zDigit} from ${elims.length} cell(s)`,
          };
        }
      }
    }
  }
  return null;
};
