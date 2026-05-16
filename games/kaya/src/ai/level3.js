/* ============================================================================
 * Level 3 -- Medium
 * ----------------------------------------------------------------------------
 * Minimax search with alpha-beta pruning, depth 3 (3 half-moves from
 * the root: bot → human → bot, then static eval). Candidates limited
 * to radius-2 of existing stones, which caps branching factor around
 * 25-45 in practice.
 *
 * Move ordering: a quick shallow `evalPlaceMove` per candidate drives
 * the order we search them, which makes alpha-beta prune aggressively.
 * Typical search completes in 40-200 ms on a mid-range laptop.
 *
 * Fast paths:
 *   - If either player has an immediate 5-in-a-row, we short-circuit
 *     without searching (one pass each way).
 *
 * The static evaluator is the whole-board `evaluate()` defined in
 * patterns.js. It returns a positive number when the position favours
 * the bot, negative when it favours the human.
 * ============================================================================ */

import { idxOf, rcOf, BLACK, WHITE, EMPTY } from '../game/coords.js';
import { findWinLine } from '../game/rules.js';
import { candidates, evalPlaceMove, evaluate, WIN_SCORE } from './patterns.js';

const DEPTH = 3;

function otherPlayer(p) { return p === BLACK ? WHITE : BLACK; }

/** Sort candidate indices by a cheap local score so best-looking moves
 *  come first -- alpha-beta then prunes the tail of the list. */
function orderedCandidates(cells, size, player) {
  const cs = Array.from(candidates(cells, size, 2));
  // Precompute scores once; sort desc.
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
  // Static eval at horizon.
  if (depth === 0) return evaluate(cells, size, botColor);

  const ordered = orderedCandidates(cells, size, toMove);
  if (ordered.length === 0) return evaluate(cells, size, botColor);

  const isMax = toMove === botColor;
  let best = isMax ? -Infinity : +Infinity;
  // Keep the candidate list bounded so catastrophic branching (wide
  // opening positions) can't blow the time budget. Top 16 is plenty
  // given alpha-beta + good ordering.
  const MAX_BREADTH = 16;
  const pool = ordered.slice(0, MAX_BREADTH);

  for (const idx of pool) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = toMove;

    // Immediate-terminal short-circuit: if this move is 5-in-a-row it
    // beats every other continuation at this ply.
    const winLine = findWinLine(cells, size, r, c, toMove);
    let val;
    if (winLine) {
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
    if (alpha >= beta) break;     // prune
  }
  return best;
}

export function pickMoveLevel3(cells, size, botColor) {
  const humanColor = otherPlayer(botColor);

  // Immediate win / block -- same priority as L1+L2, kept outside
  // the minimax loop so we don't spend millis on forced continuations.
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

  // Root search
  const ordered = orderedCandidates(cells, size, botColor);
  if (ordered.length === 0) {
    const cen = Math.floor(size / 2);
    return { r: cen, c: cen };
  }
  let bestIdx = ordered[0];
  let bestVal = -Infinity;
  let alpha = -Infinity;
  const beta = +Infinity;
  const pool = ordered.slice(0, 20);   // wider root -- first move matters most

  for (const idx of pool) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = botColor;
    let val;
    const winLine = findWinLine(cells, size, r, c, botColor);
    if (winLine) {
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
