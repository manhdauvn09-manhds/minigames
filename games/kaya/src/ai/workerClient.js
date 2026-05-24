/* ============================================================================
 * Main-thread Worker client
 * ----------------------------------------------------------------------------
 * Wraps the AI worker in a promise interface so callers can `await` a
 * move without touching postMessage. Single-worker pool: if a second
 * pick() arrives while one is in flight, the prior request is
 * abandoned (its response is ignored when it lands) -- matches the
 * UX rule "user clicks New Game -> any pending bot think is dropped".
 *
 * Falls back to a sync-import pickMove if Worker construction fails
 * (old browsers, blob:/file: origins, strict CSPs). Callers do not
 * have to branch -- they always `await client.pick(...)`.
 * ============================================================================ */

let _reqSeq = 0;

export class AIWorkerClient {
  constructor() {
    this._worker = null;
    this._current = null;      // { reqId, resolve, reject }
    this._fallback = null;     // lazily-loaded sync dispatcher
    this._workerOK = true;
    try {
      // Type: 'module' lets the worker import the other ai/* files.
      // Resolve relative to this module — works at any deploy path.
      this._worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      this._worker.onmessage = e => this._onMessage(e);
      this._worker.onerror = e => this._onError(e);
    } catch (err) {
      console.warn('[kaya] Worker unavailable, falling back to sync AI:', err);
      this._workerOK = false;
    }
  }

  _onMessage(e) {
    const { reqId, r, c, error, elapsedMs, level } = e.data || {};
    const cur = this._current;
    if (!cur || cur.reqId !== reqId) return;   // stale result, ignore
    this._current = null;
    if (error) cur.reject(new Error(error));
    else cur.resolve({ r, c, elapsedMs, level });
  }

  _onError(e) {
    const cur = this._current;
    if (!cur) return;
    this._current = null;
    cur.reject(new Error(e.message || 'worker error'));
  }

  async _syncFallback(level, cells, size, botColor, budgetMs) {
    if (!this._fallback) {
      this._fallback = await import('./index.js');
    }
    // Levels 4-5 are designed for the Web Worker (300-2500 ms compute time).
    // Running them synchronously on the main thread blocks all user input for
    // that duration — the user perceives it as "JavaScript blocking movement."
    // Cap to level 3 (≤ 200 ms) so the main thread stays responsive.
    const safeLevel = Math.min(level, 3);
    const t0 = performance.now();
    const pick = this._fallback.pickMoveSync(safeLevel, cells, size, botColor, budgetMs);
    return { ...pick, elapsedMs: Math.round(performance.now() - t0), level };
  }

  /** Ask the worker to compute a move. Any prior in-flight request is
   *  abandoned. Returns Promise<{r, c, elapsedMs, level}>. */
  pick(level, cells, size, botColor, budgetMs) {
    // Abandon prior request (its reqId won't match when/if it lands).
    if (this._current) {
      this._current.reject(new Error('superseded'));
      this._current = null;
    }
    if (!this._workerOK || !this._worker) {
      return this._syncFallback(level, cells, size, botColor, budgetMs);
    }
    const reqId = ++_reqSeq;
    // Copy cells so the main thread's engine isn't racing with us.
    // Transferring the copy's buffer gives us zero-copy delivery to
    // the worker without stealing the engine's Int8Array.
    const copy = new Int8Array(cells);
    return new Promise((resolve, reject) => {
      this._current = { reqId, resolve, reject };
      try {
        this._worker.postMessage(
          { reqId, level, cells: copy, size, botColor, budgetMs },
          [copy.buffer],
        );
      } catch (err) {
        this._current = null;
        reject(err);
      }
    });
  }

  /** Drop any in-flight request (caller got a newGame / reset).
   *  The worker itself keeps running but we ignore its next reply. */
  cancel() {
    if (this._current) {
      this._current.reject(new Error('cancelled'));
      this._current = null;
    }
  }
}

/** Lazy singleton so every importer shares one worker. */
let _singleton = null;
export function getWorkerClient() {
  if (!_singleton) _singleton = new AIWorkerClient();
  return _singleton;
}
