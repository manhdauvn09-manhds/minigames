/* ============================================================================
 * Coordinate helpers
 * ----------------------------------------------------------------------------
 * Internal grid uses (row, col) with 0-based indices. Display notation is
 * "<file><rank>" where the file is a letter A..(A+size-1) and rank is a
 * 1-based number running bottom-to-top -- matching the Kaya preview which
 * uses "H8", "I8", "J10" etc. (I is NOT skipped -- Kaya shows it.)
 *
 * A single flat index `idx = row * size + col` is used for Int8Array
 * board storage; the unpack helper reverses it.
 * ============================================================================ */

const FILES = 'ABCDEFGHIJKLMNOPQRS';  // supports up to 19x19

export function notation(row, col, size = 15) {
  const file = FILES[col] || '?';
  const rank = size - row;              // top row = highest rank
  return `${file}${rank}`;
}

export function idxOf(row, col, size) {
  return row * size + col;
}

export function rcOf(idx, size) {
  return [Math.floor(idx / size), idx % size];
}

/** Canonical hoshi ("star") points for the standard sizes.
 *  Coords are 0-indexed (row, col). Empty array => no stars drawn. */
export function hoshiPoints(size) {
  if (size === 15) {
    return [
      [3, 3],  [3, 11],
      [7, 7],                     // tengen (centre)
      [11, 3], [11, 11],
    ];
  }
  if (size === 19) {
    return [
      [3, 3],  [3, 9],  [3, 15],
      [9, 3],  [9, 9],  [9, 15],
      [15, 3], [15, 9], [15, 15],
    ];
  }
  return [];
}

/** Player constants kept in one place so render.js, rules.js and the
 *  engine all agree. 0 = empty cell. */
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export function otherPlayer(p) {
  return p === BLACK ? WHITE : BLACK;
}
