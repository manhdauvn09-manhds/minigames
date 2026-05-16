// Bitmask helpers — the heart of the engine's performance story.
//
// Sudoku digits are 1..9. Storing a candidate set per cell as
// `Set<number>` is correct but slow: every `has`/`add`/`size` is a
// hashmap op. A 9-bit number (bits 1..9 set when that digit is a
// candidate) does the same thing in 1-3 CPU cycles.
//
//   Set repr  vs  bitmask:
//     has(v)        →  (mask & BIT[v]) !== 0
//     add(v)        →  mask |= BIT[v]
//     remove(v)     →  mask &= ~BIT[v]
//     size          →  popcount(mask)
//     intersect     →  a & b
//     union         →  a | b
//     symmDiff      →  a ^ b
//
// We use bits 1..9 (bit 0 unused) so digit `d` maps to `1 << d`. That
// way `BIT[v]` is just `1 << v` — no -1 offsets to confuse.
//
// `RegionMasks` tracks which digits are *already used* in each row /
// col / box. `getCandidates` for a cell becomes:
//     ALL_DIGITS & ~(rowMask[r] | colMask[c] | boxMask[boxIdx(r,c)])
// A 3-AND op replacing the naive 20-cell scan in `getPeers`.

import { BOARD_SIZE, BOX_SIZE } from './constants';
import type { Board } from './types';

/** All digits 1..9 set; bit 0 always 0. Useful as `& ALL_DIGITS` when
 * masking out the unused bit. */
export const ALL_DIGITS = 0b1111111110; // 0x3FE — bits 1..9

/** `BIT[d]` = bit mask for digit d (1..9). `BIT[0]` is unused. */
export const BIT = (() => {
  const a = new Int32Array(10);
  for (let d = 1; d <= 9; d++) a[d] = 1 << d;
  return a;
})();

/** `boxIdx(r, c)` — which 3x3 box (0..8) the cell sits in. */
export function boxIdx(r: number, c: number): number {
  return Math.trunc(r / BOX_SIZE) * BOX_SIZE + Math.trunc(c / BOX_SIZE);
}

/** Pop count (Hamming weight) — number of set bits in `x`.
 *
 * Branch-free SWAR. ~1 cycle on modern CPUs. Used everywhere the
 * solver needs "how many candidates does this cell have?". */
export function popcount(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return (x * 0x01010101) >>> 24;
}

/** Lowest set bit position (1..9 for our masks). Returns 0 if `x` is 0.
 *
 * Used to extract the unique digit when `popcount(x) === 1`. */
export function lowestBit(x: number): number {
  if (x === 0) return 0;
  // Math.log2(x & -x) is portable + fast enough; the Math.log2 call is
  // ~10ns. For inner-loop hot spots we already have `popcount` above
  // so this is fine.
  let n = 0;
  let v = x & -x;
  while (v > 1) {
    v >>>= 1;
    n++;
  }
  return n;
}

/** Iterate digits set in mask, yielding 1..9 in ascending order.
 *
 * Generator overhead in V8 is ~200ns/yield — too slow for hot paths.
 * For the inner solver/generator loops use the inline pattern:
 *
 *   for (let m = mask, v = lowestBit(m); m; m &= m - 1, v = lowestBit(m)) { … }
 *
 * This generator is for less-hot paths where readability wins. */
export function* iterDigits(mask: number): Generator<number> {
  let m = mask;
  while (m) {
    const lsb = m & -m; // lowest set bit
    yield lowestBit(lsb);
    m &= m - 1;
  }
}

/** Convert bitmask to sorted array — for tests, hint output, and the
 * `Notes` adapter the UI consumes. */
export function maskToArray(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) {
    if (mask & BIT[d]) out.push(d);
  }
  return out;
}

/** Convert sorted array of digits to bitmask. Inverse of `maskToArray`. */
export function arrayToMask(arr: readonly number[]): number {
  let m = 0;
  for (const d of arr) m |= BIT[d];
  return m;
}

// ── Region masks (row/col/box used-digit tracking) ──────────────────
//
// Each entry is a 9-bit mask; bit `d` set means digit `d` is already
// placed in that region. Three Uint16Arrays covering all 9 rows / 9
// cols / 9 boxes.
export interface RegionMasks {
  row: Uint16Array; // length 9
  col: Uint16Array; // length 9
  box: Uint16Array; // length 9
}

export function emptyRegionMasks(): RegionMasks {
  return {
    row: new Uint16Array(BOARD_SIZE),
    col: new Uint16Array(BOARD_SIZE),
    box: new Uint16Array(BOARD_SIZE),
  };
}

/** Build region masks from a board snapshot. O(81). */
export function regionMasksFromBoard(board: Board): RegionMasks {
  const m = emptyRegionMasks();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (v != null) {
        const bit = BIT[v];
        m.row[r] |= bit;
        m.col[c] |= bit;
        m.box[boxIdx(r, c)] |= bit;
      }
    }
  }
  return m;
}

/** Place digit `v` at (r,c) in the region masks. Caller is responsible
 * for asserting the cell was empty + the placement legal. */
export function maskPlace(m: RegionMasks, r: number, c: number, v: number): void {
  const b = BIT[v];
  m.row[r] |= b;
  m.col[c] |= b;
  m.box[boxIdx(r, c)] |= b;
}

/** Inverse of `maskPlace`. Used when unwinding backtracking. */
export function maskUnplace(m: RegionMasks, r: number, c: number, v: number): void {
  const b = ~BIT[v];
  m.row[r] &= b;
  m.col[c] &= b;
  m.box[boxIdx(r, c)] &= b;
}

/** Candidates for empty cell (r,c) given current region masks.
 *
 * 3 ORs + 1 AND + 1 NOT — replaces the naive "loop over 20 peers and
 * collect their values" scan. This is the hot-path winner. */
export function candidatesFor(m: RegionMasks, r: number, c: number): number {
  return ALL_DIGITS & ~(m.row[r] | m.col[c] | m.box[boxIdx(r, c)]);
}
