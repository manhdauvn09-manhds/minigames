// EngineClient — main-thread proxy in front of engine.worker.ts.
//
// Usage:
//   const engine = new EngineClient();
//   const puzzle = await engine.generate(4);
//   const next   = await engine.hint(board);
//   engine.terminate();          // when component unmounts
//
// Single in-flight queue per worker (sequential). For Phase 4 UI this is
// enough: user clicks "New Game" → one generate(); generate() returns
// → store updates → screen swaps. Phase 7B race mode might want a
// pool of workers; revisit then.

import type { Board, DifficultyLevel, Puzzle } from '../core/types';
import type { EngineRequest, EngineResponse } from './engine.worker';
import type { TechniqueResult } from '../core/techniques/types';
import type { SolveResult } from '../core/solver';

export class EngineClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor() {
    this.worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<EngineResponse>) => {
      const handler = this.pending.get(e.data.id);
      if (!handler) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) handler.resolve(e.data.data);
      else handler.reject(new Error(e.data.error ?? 'engine error'));
    };
  }

  private send<T>(cmd: EngineRequest['cmd']): Promise<T> {
    const id = this.nextId++;
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.worker.postMessage({ id, cmd } satisfies EngineRequest);
    return promise;
  }

  generate(level: DifficultyLevel, opts?: { seed?: number | string; budgetMs?: number }): Promise<Puzzle> {
    return this.send<Puzzle>({ type: 'generate', level, ...opts });
  }

  solve(board: Board): Promise<Board | null> {
    return this.send<Board | null>({ type: 'solve', board });
  }

  count(board: Board, limit: number): Promise<number> {
    return this.send<number>({ type: 'count', board, limit });
  }

  hint(board: Board, maxLevel?: 1 | 2 | 3 | 4 | 5): Promise<TechniqueResult | null> {
    return this.send<TechniqueResult | null>({ type: 'hint', board, maxLevel });
  }

  trace(board: Board, maxLevel?: 1 | 2 | 3 | 4 | 5): Promise<SolveResult> {
    return this.send<SolveResult>({ type: 'trace', board, maxLevel });
  }

  terminate(): void {
    this.worker.terminate();
    for (const { reject } of this.pending.values()) {
      reject(new Error('engine terminated'));
    }
    this.pending.clear();
  }
}
