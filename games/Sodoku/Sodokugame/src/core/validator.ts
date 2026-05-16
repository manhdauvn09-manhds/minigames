// Validator + board state queries — pure, no React.
//
// The "old" / readability API uses Board (number|null grid) + Notes
// (Set<number> grid). The "new" / hot-path API works directly on the
// Uint16Array bitmask representation, exposed by `bitmask.ts`. Both
// coexist:
//
//   - The UI store (Phase 3) reads/writes Board so it can be JSON
//     serialised, persisted to localStorage, sent over the WebSocket
//     for multiplayer, and rendered cell-by-cell.
//   - The solver/generator hot path operates on bitmasks for speed,
//     converting in/out at the API boundary.

import { BOARD_SIZE, BOX_SIZE } from './constants';
import type { Board, CellPosition, CellValue, Notes } from './types';
import {
  ALL_DIGITS,
  BIT,
  boxIdx,
  candidatesFor,
  maskToArray,
  popcount,
  regionMasksFromBoard,
} from './bitmask';

/** Make a deep-copy of a board so callers can mutate without aliasing. */
export function cloneBoard(board: Board): Board {
  const out: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: CellValue[] = new Array(BOARD_SIZE);
    for (let c = 0; c < BOARD_SIZE; c++) row[c] = board[r][c];
    out.push(row);
  }
  return out;
}

/** Empty 9x9 board (all nulls). */
export function emptyBoard(): Board {
  const out: Board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    out.push(new Array(BOARD_SIZE).fill(null) as CellValue[]);
  }
  return out;
}

/** Empty notes grid — Set per cell. */
export function emptyNotes(): Notes {
  const out: Notes = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: Set<number>[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) row.push(new Set<number>());
    out.push(row);
  }
  return out;
}

/** Can `value` legally go at (r,c)? */
export function isValidPlacement(
  board: Board, r: number, c: number, value: number,
): boolean {
  if (board[r][c] != null) return false;
  // Row + col scan
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (board[r][i] === value) return false;
    if (board[i][c] === value) return false;
  }
  // Box scan
  const br = Math.trunc(r / BOX_SIZE) * BOX_SIZE;
  const bc = Math.trunc(c / BOX_SIZE) * BOX_SIZE;
  for (let dr = 0; dr < BOX_SIZE; dr++) {
    for (let dc = 0; dc < BOX_SIZE; dc++) {
      if (board[br + dr][bc + dc] === value) return false;
    }
  }
  return true;
}

/** All cells that conflict with placing `value` at (r,c). Useful for
 * the "highlight conflicts" UI affordance. */
export function findConflicts(
  board: Board, r: number, c: number, value: number,
): CellPosition[] {
  const out: CellPosition[] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (i !== c && board[r][i] === value) out.push({ row: r, col: i });
    if (i !== r && board[i][c] === value) out.push({ row: i, col: c });
  }
  const br = Math.trunc(r / BOX_SIZE) * BOX_SIZE;
  const bc = Math.trunc(c / BOX_SIZE) * BOX_SIZE;
  for (let dr = 0; dr < BOX_SIZE; dr++) {
    for (let dc = 0; dc < BOX_SIZE; dc++) {
      const rr = br + dr, cc = bc + dc;
      if ((rr !== r || cc !== c) && board[rr][cc] === value) {
        // Skip dupes already added by row/col scans.
        if (!out.some((p) => p.row === rr && p.col === cc)) {
          out.push({ row: rr, col: cc });
        }
      }
    }
  }
  return out;
}

/** Every empty cell filled? */
export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] == null) return false;
    }
  }
  return true;
}

/** Are there NO duplicates per row/col/box? Independent of completeness. */
export function isBoardValid(board: Board): boolean {
  const rowMask = new Uint16Array(BOARD_SIZE);
  const colMask = new Uint16Array(BOARD_SIZE);
  const boxMask = new Uint16Array(BOARD_SIZE);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const v = board[r][c];
      if (v == null) continue;
      const b = BIT[v];
      const bi = boxIdx(r, c);
      if ((rowMask[r] & b) || (colMask[c] & b) || (boxMask[bi] & b)) return false;
      rowMask[r] |= b;
      colMask[c] |= b;
      boxMask[bi] |= b;
    }
  }
  return true;
}

/** Candidates for empty cell (r,c), as sorted array. Wraps the
 * bitmask hot path for the readability API. */
export function getCandidates(board: Board, r: number, c: number): number[] {
  if (board[r][c] != null) return [];
  const m = regionMasksFromBoard(board);
  return maskToArray(candidatesFor(m, r, c));
}

/** The 20 cells in the same row/col/box as (r,c), excluding (r,c).
 *
 * Cached on first call — `peers[r*9+c]` is reused across the entire
 * solver/generator lifetime. */
const _peerCache: CellPosition[][] = [];

export function getPeers(r: number, c: number): CellPosition[] {
  const key = r * BOARD_SIZE + c;
  if (_peerCache[key]) return _peerCache[key];
  const peers: CellPosition[] = [];
  const seen = new Set<number>();
  const add = (rr: number, cc: number) => {
    const k = rr * BOARD_SIZE + cc;
    if ((rr !== r || cc !== c) && !seen.has(k)) {
      seen.add(k);
      peers.push({ row: rr, col: cc });
    }
  };
  for (let i = 0; i < BOARD_SIZE; i++) {
    add(r, i);
    add(i, c);
  }
  const br = Math.trunc(r / BOX_SIZE) * BOX_SIZE;
  const bc = Math.trunc(c / BOX_SIZE) * BOX_SIZE;
  for (let dr = 0; dr < BOX_SIZE; dr++) {
    for (let dc = 0; dc < BOX_SIZE; dc++) {
      add(br + dr, bc + dc);
    }
  }
  _peerCache[key] = peers;
  return peers;
}

/** Candidate matrix as `Notes` (Set per cell) — the API the UI consumes.
 *
 * For hot-path math, prefer the bitmask version returned by
 * `computeAllCandidatesMask`. */
export function computeAllCandidates(board: Board): Notes {
  const masks = computeAllCandidatesMask(board);
  const notes = emptyNotes();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] != null) continue;
      const m = masks[r * BOARD_SIZE + c];
      for (let d = 1; d <= 9; d++) {
        if (m & BIT[d]) notes[r][c].add(d);
      }
    }
  }
  return notes;
}

/** Candidate matrix as a flat Uint16Array (length 81). Filled cells are
 * encoded as 0. Hot-path API for solver/techniques. */
export function computeAllCandidatesMask(board: Board): Uint16Array {
  const out = new Uint16Array(BOARD_SIZE * BOARD_SIZE);
  const m = regionMasksFromBoard(board);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] != null) continue;
      out[r * BOARD_SIZE + c] = candidatesFor(m, r, c);
    }
  }
  return out;
}

/** Count of empty cells. */
export function emptyCount(board: Board): number {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] == null) n++;
    }
  }
  return n;
}

// Re-export selected bitmask helpers so the UI / store can convert
// without reaching into ./bitmask directly.
export { ALL_DIGITS, BIT, popcount, maskToArray };
export { regionMasksFromBoard, candidatesFor, emptyRegionMasks } from './bitmask';
