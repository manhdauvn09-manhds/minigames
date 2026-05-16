/* ============================================================================
 * Board state model
 * ----------------------------------------------------------------------------
 * Owns the authoritative game state: cells, turn order, move history,
 * winner, winning line. Emits DOM-style CustomEvents so main.js can wire
 * the UI without the engine having to know about DOM at all.
 *
 * Events (bubble on the Board instance, which extends EventTarget):
 *   'move'   { detail: { r, c, player, idx, moveNo, ts } }
 *   'win'    { detail: { player, line: [idx,idx,idx,idx,idx] } }
 *   'draw'   { detail: {} }
 *   'reset'  { detail: { size, firstPlayer } }
 *   'undo'   { detail: { moveNo } }
 *
 * The `place()` return value is the same shape as a 'move' event detail,
 * plus `winLine` if that move ended the game -- keeps callers that prefer
 * imperative style (no listener) happy too.
 * ============================================================================ */

import { idxOf, BLACK, WHITE, EMPTY } from './coords.js';
import { findWinLine, isDraw } from './rules.js';

export class Board extends EventTarget {
  constructor({ size = 15, firstPlayer = BLACK } = {}) {
    super();
    this._reset(size, firstPlayer);
  }

  _reset(size, firstPlayer) {
    this.size = size;
    this.cells = new Int8Array(size * size);
    this.turn = firstPlayer;
    this.history = [];        // [{ r, c, player, idx, ts }]
    this.winner = 0;          // 0 = ongoing, 1 = black, 2 = white, 3 = draw
    this.winLine = null;
    this.startedAt = Date.now();
  }

  /** Full reset. `firstPlayer` defaults to BLACK (standard Gomoku).
   *  Emits 'reset'. */
  reset({ size = this.size, firstPlayer = BLACK } = {}) {
    this._reset(size, firstPlayer);
    this.dispatchEvent(new CustomEvent('reset', {
      detail: { size: this.size, firstPlayer },
    }));
  }

  /** Place a stone. Returns null if the move is illegal (off-board, cell
   *  occupied, game over). On success returns an object; also emits
   *  'move' then, if the move ended the game, 'win' or 'draw'. */
  place(r, c) {
    if (this.winner !== 0) return null;
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return null;
    const idx = idxOf(r, c, this.size);
    if (this.cells[idx] !== EMPTY) return null;

    const player = this.turn;
    this.cells[idx] = player;
    const move = {
      r, c, player, idx,
      moveNo: this.history.length + 1,
      ts: Date.now(),
    };
    this.history.push(move);

    const line = findWinLine(this.cells, this.size, r, c, player);
    const dispatchMove = { ...move };

    if (line) {
      this.winner = player;
      this.winLine = line;
      dispatchMove.winLine = line;
      this.dispatchEvent(new CustomEvent('move', { detail: move }));
      this.dispatchEvent(new CustomEvent('win', {
        detail: { player, line },
      }));
      return dispatchMove;
    }

    if (isDraw(this.cells)) {
      this.winner = 3;
      this.dispatchEvent(new CustomEvent('move', { detail: move }));
      this.dispatchEvent(new CustomEvent('draw', { detail: {} }));
      return dispatchMove;
    }

    this.turn = player === BLACK ? WHITE : BLACK;
    this.dispatchEvent(new CustomEvent('move', { detail: move }));
    return dispatchMove;
  }

  /** Undo the last move. Returns the undone move or null if history empty.
   *  Also clears winner/winLine if they were set by that move. */
  undo() {
    const last = this.history.pop();
    if (!last) return null;
    this.cells[last.idx] = EMPTY;
    this.turn = last.player;          // the colour that just moved becomes
                                      // the colour to move again
    if (this.winner !== 0) {
      this.winner = 0;
      this.winLine = null;
    }
    this.dispatchEvent(new CustomEvent('undo', {
      detail: { moveNo: last.moveNo },
    }));
    return last;
  }

  /** Elapsed time since game start (ms). Convenience for the timer card. */
  elapsedMs() {
    return Date.now() - this.startedAt;
  }
}
