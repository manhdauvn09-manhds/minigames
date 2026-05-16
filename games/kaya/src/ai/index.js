/* ============================================================================
 * AI dispatcher (async)
 * ----------------------------------------------------------------------------
 * Unified async API for the game engine:
 *
 *   pickMove(level, cells, size, botColor, client?) -> Promise<{r, c, elapsedMs, level}>
 *
 * Behaviour:
 *   - Levels 1-3: run synchronously on the main thread (wrapped in
 *     Promise.resolve so the caller's `await` still works).
 *   - Levels 4-5: routed to the shared AIWorkerClient.
 *
 * The caller injects `client` (the worker client singleton) so the
 * tests / self-test harness can stub it if needed. When undefined we
 * lazily grab the singleton.
 *
 * Also exports `pickMoveSync` for the worker itself to re-use (or for
 * the main thread when Worker is unavailable).
 * ============================================================================ */

import { pickMoveLevel1 } from './level1.js';
import { pickMoveLevel2 } from './level2.js';
import { pickMoveLevel3 } from './level3.js';
import { pickMoveLevel4 } from './level4.js';
import { pickMoveLevel5 } from './level5.js';
import { getWorkerClient } from './workerClient.js';

export function pickMoveSync(level, cells, size, botColor, budgetMs) {
  switch (level) {
    case 1: return pickMoveLevel1(cells, size, botColor);
    case 2: return pickMoveLevel2(cells, size, botColor);
    case 3: return pickMoveLevel3(cells, size, botColor);
    case 4: return pickMoveLevel4(cells, size, botColor);
    case 5: return pickMoveLevel5(cells, size, botColor, budgetMs);
    default: return pickMoveLevel3(cells, size, botColor);
  }
}

export async function pickMove(level, cells, size, botColor, client) {
  if (level <= 3) {
    const t0 = performance.now();
    const pick = pickMoveSync(level, cells, size, botColor);
    return { ...pick, level, elapsedMs: Math.round(performance.now() - t0) };
  }
  const c = client || getWorkerClient();
  return c.pick(level, cells, size, botColor);
}
