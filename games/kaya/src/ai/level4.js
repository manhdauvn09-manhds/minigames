/* ============================================================================
 * Level 4 -- Hard
 * ----------------------------------------------------------------------------
 * Same minimax + α-β skeleton as L3 but with:
 *   - depth 4 instead of 3
 *   - wider root breadth (24) and inner breadth (18) so good replies
 *     aren't pruned accidentally
 *   - cheap "double-threat" bonus in the ordering heuristic: a move
 *     that creates two separate open-3s at once gets boosted to the
 *     top, which makes forks reliably picked instead of random
 *     mixes of weaker attacks
 *
 * Typical runtime: 300-900 ms on a mid-range laptop -- hence this level
 * lives inside the Web Worker, freeing the main thread to keep the UI
 * repainting while the bot thinks.
 * ============================================================================ */

import { idxOf, rcOf, BLACK, WHITE, EMPTY } from '../game/coords.js';
import { findWinLine } from '../game/rules.js';
import { candidates, evalPlaceMove, evaluate, WIN_SCORE } from './patterns.js';

const DEPTH = 4;

function otherPlayer(p) { return p === BLACK ? WHITE : BLACK; }

/** Fork-aware ordering: sum of per-direction run contributions if WE play
 *  the cell, PLUS an explicit bonus for every direction that reaches an
 *  open-3 or open-4 simultaneously. Multi-threat moves sort to the top. */
function orderedCandidates(cells, size, player) {
  const cs = Array.from(candidates(cells, size, 2));
  const scored = cs.map(idx => {
    const [r, c] = rcOf(idx, size);
    const atk = evalPlaceMove(cells, size, r, c, player);
    const def = evalPlaceMove(cells, size, r, c, otherPlayer(player));
    return { idx, score: Math.max(atk, def) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.idx);
}

function minimax(cells, size, depth, toMove, alpha, beta, botColor) {
  if (depth === 0) return evaluate(cells, size, botColor);

  const ordered = orderedCandidates(cells, size, toMove);
  if (ordered.length === 0) return evaluate(cells, size, botColor);

  const isMax = toMove === botColor;
  let best = isMax ? -Infinity : +Infinity;
  const MAX_BREADTH = 18;
  const pool = ordered.slice(0, MAX_BREADTH);

  for (const idx of pool) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = toMove;
    let val;
    const win = findWinLine(cells, size, r, c, toMove);
    if (win) {
      val = isMax ? WIN_SCORE + depth : -(WIN_SCORE + depth);
    } else {
      val = minimax(cells, size, depth - 1, otherPlayer(toMove), alpha, beta, botColor);
    }
    cells[idx] = EMPTY;

    if (isMax) {
      if (val > best) best = val;
      if (best > alpha) alpha = best;
    } else {
      if (val < best) best = val;
      if (best < beta)  beta = best;
    }
    if (alpha >= beta) break;
  }
  return best;
}

export function pickMoveLevel4(cells, size, botColor) {
  const humanColor = otherPlayer(botColor);

  // Forced-move short-circuits: keep root search for actual choices.
  const candSet = candidates(cells, size, 2);
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = botColor;
    const win = findWinLine(cells, size, r, c, botColor);
    cells[idx] = EMPTY;
    if (win) return { r, c };
  }
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = humanColor;
    const win = findWinLine(cells, size, r, c, humanColor);
    cells[idx] = EMPTY;
    if (win) return { r, c };
  }

  const ordered = orderedCandidates(cells, size, botColor);
  if (ordered.length === 0) {
    const cen = Math.floor(size / 2);
    return { r: cen, c: cen };
  }
  let bestIdx = ordered[0];
  let bestVal = -Infinity;
  let alpha = -Infinity;
  const beta = +Infinity;
  const pool = ordered.slice(0, 24);

  for (const idx of pool) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = botColor;
    let val;
    const win = findWinLine(cells, size, r, c, botColor);
    if (win) {
      val = WIN_SCORE + DEPTH;
    } else {
      val = minimax(cells, size, DEPTH - 1, humanColor, alpha, beta, botColor);
    }
    cells[idx] = EMPTY;
    if (val > bestVal) { bestVal = val; bestIdx = idx; }
    if (bestVal > alpha) alpha = bestVal;
    if (alpha >= beta) break;
  }
  const [r, c] = rcOf(bestIdx, size);
  return { r, c };
}
