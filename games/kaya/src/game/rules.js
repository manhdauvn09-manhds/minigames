/* ============================================================================
 * Win detection -- 5 consecutive stones in any of four directions.
 * ----------------------------------------------------------------------------
 * We only scan lines that pass THROUGH the last-placed stone, because a win
 * can never appear elsewhere on the move that didn't create it. That keeps
 * the check O(4·9) ~ 36 comparisons per move instead of full-board scans.
 *
 * Rules used: standard Gomoku "5 in a row wins" (no "open-end" qualifier,
 * no overline restriction). This matches the PROMPT_CAROGAME spec.
 *
 * Returns an array of 5 indices [idx0..idx4] on a win, or null otherwise.
 * ============================================================================ */

import { idxOf } from './coords.js';

const DIRS = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // main diagonal ↘
  [1, -1],  // anti diagonal ↙
];

/** @param cells Int8Array, @param size board side, @param r, c last-moved row/col,
 *  @param player the stone colour just placed.
 *  @returns number[] (length 5) | null. */
export function findWinLine(cells, size, r, c, player) {
  for (const [dr, dc] of DIRS) {
    // Walk back from (r,c) to find the start of this line-run.
    let rs = r, cs = c;
    while (true) {
      const nr = rs - dr, nc = cs - dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
      if (cells[idxOf(nr, nc, size)] !== player) break;
      rs = nr; cs = nc;
    }
    // Count forward run length.
    let count = 0;
    let rr = rs, cc = cs;
    while (rr >= 0 && rr < size && cc >= 0 && cc < size
           && cells[idxOf(rr, cc, size)] === player) {
      count++;
      rr += dr; cc += dc;
    }
    if (count >= 5) {
      // Emit exactly 5 indices starting at (rs, cs) for the overlay.
      const line = new Array(5);
      for (let i = 0; i < 5; i++) {
        line[i] = idxOf(rs + dr * i, cs + dc * i, size);
      }
      return line;
    }
  }
  return null;
}

/** True when every cell is occupied and nobody has won.
 *  Callers should check this AFTER findWinLine returns null. */
export function isDraw(cells) {
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === 0) return false;
  }
  return true;
}
