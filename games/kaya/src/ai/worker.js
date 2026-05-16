/* ============================================================================
 * AI Web Worker
 * ----------------------------------------------------------------------------
 * Receives `{ level, cells, size, botColor, budgetMs? }` messages from
 * the main thread, runs the matching picker synchronously on this
 * worker thread, then posts back `{ r, c, level, elapsedMs }`.
 *
 * Only levels 4 and 5 are routed here (levels 1-3 stay on the main
 * thread because their runtime is below the postMessage round-trip
 * overhead). We still dispatch L1-L3 if asked -- makes the worker a
 * drop-in for any level should we ever want to move everything off
 * the main thread.
 *
 * This file is loaded as an ES module via:
 *   new Worker('/src/ai/worker.js', { type: 'module' })
 * which means we get normal `import` syntax + dynamic deps resolution.
 * nginx (PHASE 1 config) already serves .js with the right MIME type.
 * ============================================================================ */

import { pickMoveLevel1 } from './level1.js';
import { pickMoveLevel2 } from './level2.js';
import { pickMoveLevel3 } from './level3.js';
import { pickMoveLevel4 } from './level4.js';
import { pickMoveLevel5 } from './level5.js';

/* eslint-env worker */

self.onmessage = (e) => {
  const { level, cells, size, botColor, budgetMs, reqId } = e.data;
  const t0 = performance.now();

  // Incoming cells buffer was transferred -- wrap in Int8Array. The
  // ops below mutate it in-place (place + undo) which is safe: the
  // main thread already dropped ownership.
  const view = new Int8Array(cells);
  let pick;
  try {
    switch (level) {
      case 1: pick = pickMoveLevel1(view, size, botColor); break;
      case 2: pick = pickMoveLevel2(view, size, botColor); break;
      case 3: pick = pickMoveLevel3(view, size, botColor); break;
      case 4: pick = pickMoveLevel4(view, size, botColor); break;
      case 5: pick = pickMoveLevel5(view, size, botColor, budgetMs); break;
      default: pick = pickMoveLevel3(view, size, botColor);
    }
  } catch (err) {
    self.postMessage({
      reqId,
      error: String(err?.message || err),
    });
    return;
  }
  self.postMessage({
    reqId,
    r: pick.r,
    c: pick.c,
    level,
    elapsedMs: Math.round(performance.now() - t0),
  });
};
