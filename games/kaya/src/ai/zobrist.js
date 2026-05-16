/* ============================================================================
 * Zobrist hashing for the transposition table.
 * ----------------------------------------------------------------------------
 * Gives every (cell, player) pair a random 32-bit key. The board hash is
 * the XOR of keys for all currently-occupied (cell, player) pairs.
 *
 *   - Placing a stone:  h ^= key[idx][player]
 *   - Removing a stone: h ^= key[idx][player]     (XOR is its own inverse)
 *
 * 32 bits means a theoretical ~1-in-4 billion collision per pair of
 * positions. TT collisions are self-healing in minimax (wrong score
 * just triggers a re-search), so that's more than safe enough.
 *
 * The worker and the main thread each initialise their own table with
 * the same seeded RNG so keys are stable within one page load but
 * different across reloads -- which is fine, TT doesn't persist.
 * ============================================================================ */

const MAX_SIDE = 19;
const N = MAX_SIDE * MAX_SIDE;

// Deterministic seeded xorshift so both threads agree on keys when
// operating on positions crossed between them (shouldn't happen in
// practice, but keeps the invariant safe under future refactors).
let _state = 0x9E3779B9 | 0;
function xorshift32() {
  let x = _state;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  _state = x | 0;
  return x >>> 0;
}

/** Key tables. `KEYS[idx][player]` where player is 1 (BLACK) or 2 (WHITE). */
export const KEYS = new Array(N);
for (let i = 0; i < N; i++) {
  KEYS[i] = [0, xorshift32(), xorshift32()];   // slot 0 unused (empty = no hash)
}

/** Hash the full board from scratch. Only used on search entry; the
 *  incremental XOR in minimax keeps it in sync move-by-move. */
export function hashOf(cells, size) {
  let h = 0;
  for (let i = 0; i < size * size; i++) {
    const v = cells[i];
    if (v !== 0) h ^= KEYS[i][v];
  }
  return h >>> 0;
}

/** XOR a single (idx, player) in or out. Used by minimax to update the
 *  running hash when placing / undoing a stone. Returns the new hash. */
export function toggle(hash, idx, player) {
  return (hash ^ KEYS[idx][player]) >>> 0;
}
