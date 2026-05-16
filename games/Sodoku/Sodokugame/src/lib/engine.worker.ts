// Engine Web Worker — runs generator/solver off the main thread so a
// slow Level 5 generation (rare outliers can spike to >500ms) doesn't
// block UI animations.
//
// Vite resolves `new Worker(new URL('./engine.worker.ts', import.meta.url),
// { type: 'module' })` to a separate bundle automatically.
//
// Wire pattern in components (Phase 4):
//
//   const engine = new EngineClient();
//   const puzzle = await engine.generate(level, { seed });
//   engine.terminate();
//
// EngineClient lives in src/lib/engine.ts (built next to this file).

import { generatePuzzleWithFallback } from '../core/puzzlePool';
import {
  countSolutions, getNextSolveStep, solveWithBacktracking, solveWithTechniques,
} from '../core/solver';
import type { Board, DifficultyLevel } from '../core/types';

export interface EngineRequest {
  id: number; // correlation id back to the caller
  cmd:
    | { type: 'generate'; level: DifficultyLevel; seed?: number | string; budgetMs?: number }
    | { type: 'solve'; board: Board }
    | { type: 'count'; board: Board; limit: number }
    | { type: 'hint'; board: Board; maxLevel?: 1 | 2 | 3 | 4 | 5 }
    | { type: 'trace'; board: Board; maxLevel?: 1 | 2 | 3 | 4 | 5 };
}

export interface EngineResponse {
  id: number;
  ok: boolean;
  data?: unknown;
  error?: string;
}

self.onmessage = (e: MessageEvent<EngineRequest>) => {
  const { id, cmd } = e.data;
  try {
    let data: unknown;
    switch (cmd.type) {
      case 'generate':
        data = generatePuzzleWithFallback(cmd.level, {
          seed: cmd.seed,
          budgetMs: cmd.budgetMs,
        });
        break;
      case 'solve':
        data = solveWithBacktracking(cmd.board);
        break;
      case 'count':
        data = countSolutions(cmd.board, cmd.limit);
        break;
      case 'hint':
        data = getNextSolveStep(cmd.board, cmd.maxLevel);
        break;
      case 'trace':
        data = solveWithTechniques(cmd.board, cmd.maxLevel);
        break;
    }
    const resp: EngineResponse = { id, ok: true, data };
    (self as unknown as Worker).postMessage(resp);
  } catch (err) {
    const resp: EngineResponse = { id, ok: false, error: String(err) };
    (self as unknown as Worker).postMessage(resp);
  }
};
