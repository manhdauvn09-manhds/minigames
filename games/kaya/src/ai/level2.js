/* ============================================================================
 * Level 2 -- Easy
 * ----------------------------------------------------------------------------
 * Rule-based, single-move lookahead. No minimax. Decision order:
 *   1. Win if possible.
 *   2. Block opponent's immediate win.
 *   3. Score every candidate by the "run pressure" it creates, picking
 *      the max of (attack if we play, defence if they play). Small
 *      defensive bias so threats get blocked ahead of equal attacks.
 *
 * Result: a bot that correctly blocks open-3 / open-4, sets up its own
 * open-3s, and plays the centre on the opening. Does not see forks or
 * multi-step threats, so a decent player beats it reliably.
 * ============================================================================ */

import { idxOf, rcOf, BLACK, WHITE, EMPTY } from '../game/coords.js';
import { findWinLine } from '../game/rules.js';
import { candidates, evalPlaceMove } from './patterns.js';

function otherPlayer(p) { return p === BLACK ? WHITE : BLACK; }

export function pickMoveLevel2(cells, size, botColor) {
  const humanColor = otherPlayer(botColor);

  // Immediate win
  const candSet = candidates(cells, size, 2);
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = botColor;
    const win = findWinLine(cells, size, r, c, botColor);
    cells[idx] = EMPTY;
    if (win) return { r, c };
  }
  // Immediate block
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = humanColor;
    const win = findWinLine(cells, size, r, c, humanColor);
    cells[idx] = EMPTY;
    if (win) return { r, c };
  }

  // Scored fallback. For each candidate compute max(attack, defence*0.92).
  // The 0.92 factor lets us extend our own strong line over blocking a
  // weaker opponent threat -- L1's eval matches better intuition this way.
  let bestIdx = -1, bestScore = -Infinity;
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    const atk = evalPlaceMove(cells, size, r, c, botColor);
    const def = evalPlaceMove(cells, size, r, c, humanColor) * 0.92;
    const score = Math.max(atk, def);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }

  if (bestIdx < 0) {
    // Empty board edge case (shouldn't hit: candidates() returns centre
    // on empty board), fall back to centre.
    const cen = Math.floor(size / 2);
    return { r: cen, c: cen };
  }
  const [r, c] = rcOf(bestIdx, size);
  return { r, c };
}
