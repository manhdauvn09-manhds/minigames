/* ============================================================================
 * Level 1 -- Beginner
 * ----------------------------------------------------------------------------
 * Plays mostly random moves near existing stones, but WILL block the
 * single specific threat the spec requires:
 *   "only blocks exact 4-in-a-row open threats"
 * i.e. if the human has a line that would complete 5-in-a-row on their
 * next move, level 1 blocks that one square. Other threats are ignored.
 *
 * This produces a bot a total beginner can beat 70-80% of the time:
 * it won't hand you a free win, but it also won't build a coherent
 * attack. Perfect as the "casual" entry point.
 * ============================================================================ */

import { idxOf, rcOf, BLACK, WHITE, EMPTY } from '../game/coords.js';
import { findWinLine } from '../game/rules.js';
import { candidates } from './patterns.js';

function otherPlayer(p) { return p === BLACK ? WHITE : BLACK; }

export function pickMoveLevel1(cells, size, botColor) {
  const humanColor = otherPlayer(botColor);

  // 1. If I can win outright this move, take it.
  const candSet = candidates(cells, size, 2);
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = botColor;
    const win = findWinLine(cells, size, r, c, botColor);
    cells[idx] = EMPTY;
    if (win) return { r, c };
  }

  // 2. Block the ONE cell where the human would otherwise win next move.
  //    Exact 4-in-a-row open threat = any cell whose placement gives them 5.
  for (const idx of candSet) {
    const [r, c] = rcOf(idx, size);
    cells[idx] = humanColor;
    const win = findWinLine(cells, size, r, c, humanColor);
    cells[idx] = EMPTY;
    if (win) return { r, c };
  }

  // 3. Otherwise play randomly among candidate cells (radius 1 for
  //    snugger play -- level 1's stones cluster close to the action).
  const tight = candidates(cells, size, 1);
  const pool = tight.size > 0 ? tight : candSet;
  const arr = Array.from(pool);
  const pick = arr[Math.floor(Math.random() * arr.length)];
  const [r, c] = rcOf(pick, size);
  return { r, c };
}
