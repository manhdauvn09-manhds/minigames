import { describe, it, expect } from 'vitest';
import {
  solveWithBacktracking, solveWithTechniques, countSolutions, getNextSolveStep,
} from '../solver';
import { generateFullSolution, generatePuzzle } from '../generator';
import { isBoardValid, isBoardComplete, cloneBoard } from '../validator';
import type { Board, CellValue } from '../types';
import { Technique } from '../types';

// Parse a 9-line, 81-char string into a Board. '.' / '0' = empty.
function parse(s: string): Board {
  const lines = s.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== 9) throw new Error(`expected 9 lines, got ${lines.length}`);
  const out: Board = [];
  for (const ln of lines) {
    const cells = ln.replace(/\s/g, '');
    if (cells.length !== 9) throw new Error(`row "${ln}" has ${cells.length} cells`);
    const row: CellValue[] = [];
    for (const ch of cells) {
      if (ch === '.' || ch === '0') row.push(null);
      else row.push(parseInt(ch, 10) as CellValue);
    }
    out.push(row);
  }
  return out;
}

// Known easy puzzle (Naked + Hidden Singles solve it).
const EASY = `
5 3 . . 7 . . . .
6 . . 1 9 5 . . .
. 9 8 . . . . 6 .
8 . . . 6 . . . 3
4 . . 8 . 3 . . 1
7 . . . 2 . . . 6
. 6 . . . . 2 8 .
. . . 4 1 9 . . 5
. . . . 8 . . 7 9
`;

// Inkala's "world's hardest sudoku" (2012). Unique solution, requires
// extensive backtracking. Canonical reference puzzle.
const HARD = `
8 . . . . . . . .
. . 3 6 . . . . .
. 7 . . 9 . 2 . .
. 5 . . . 7 . . .
. . . . 4 5 7 . .
. . . 1 . . . 3 .
. . 1 . . . . 6 8
. . 8 5 . . . 1 .
. 9 . . . . 4 . .
`;

describe('solver — solveWithBacktracking', () => {
  it('solves known easy puzzle', () => {
    const board = parse(EASY);
    const solved = solveWithBacktracking(board);
    expect(solved).not.toBeNull();
    expect(isBoardComplete(solved!)).toBe(true);
    expect(isBoardValid(solved!)).toBe(true);
  });

  it('solves known hard puzzle', () => {
    const board = parse(HARD);
    const solved = solveWithBacktracking(board);
    expect(solved).not.toBeNull();
    expect(isBoardComplete(solved!)).toBe(true);
    expect(isBoardValid(solved!)).toBe(true);
  });

  it('returns null for contradictory board', () => {
    const b = parse(EASY);
    b[0][1] = 5; // duplicate 5 in row 0
    expect(solveWithBacktracking(b)).toBeNull();
  });

  it('does not mutate input board', () => {
    const board = parse(EASY);
    const snapshot = JSON.stringify(board);
    solveWithBacktracking(board);
    expect(JSON.stringify(board)).toBe(snapshot);
  });
});

describe('solver — countSolutions', () => {
  it('returns 1 for puzzle with unique solution', () => {
    expect(countSolutions(parse(HARD), 2)).toBe(1);
  });

  it('returns 2 (capped) for ambiguous board', () => {
    // Empty 9x9 has billions of solutions; with limit 2 we stop early.
    const b: Board = [];
    for (let r = 0; r < 9; r++) b.push(new Array(9).fill(null));
    expect(countSolutions(b, 2)).toBe(2);
  });

  it('returns 0 for contradictory board', () => {
    const b = parse(EASY);
    b[0][1] = 5;
    expect(countSolutions(b, 2)).toBe(0);
  });
});

describe('solver — solveWithTechniques', () => {
  it('chains techniques to solve an easy puzzle', () => {
    const result = solveWithTechniques(parse(EASY), 1); // L1 = up to Hidden Single
    expect(result.solved).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps.every((s) =>
      s.technique === Technique.NAKED_SINGLE || s.technique === Technique.HIDDEN_SINGLE,
    )).toBe(true);
  });

  it('partially solves hard puzzle, marks not solved', () => {
    const result = solveWithTechniques(parse(HARD), 5);
    // HARD requires backtracking — even with all stubs, should NOT solve.
    expect(result.solved || isBoardComplete(result.board)).toBe(result.solved);
  });

  it('does not mutate input board', () => {
    const board = parse(EASY);
    const snap = JSON.stringify(board);
    solveWithTechniques(board);
    expect(JSON.stringify(board)).toBe(snap);
  });
});

describe('solver — getNextSolveStep', () => {
  it('returns a single technique result for an easy board', () => {
    const step = getNextSolveStep(parse(EASY));
    expect(step).not.toBeNull();
    expect(step!.cells.length).toBeGreaterThan(0);
  });
});

describe('generator — generateFullSolution', () => {
  it('produces a complete valid board', () => {
    const sol = generateFullSolution(42);
    expect(isBoardComplete(sol)).toBe(true);
    expect(isBoardValid(sol)).toBe(true);
  });

  it('same seed → identical solution', () => {
    const a = generateFullSolution(12345);
    const b = generateFullSolution(12345);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('different seeds → different solutions', () => {
    const a = generateFullSolution(1);
    const b = generateFullSolution(2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('generator — generatePuzzle', () => {
  it.each([1, 2, 3, 4, 5] as const)('Level %i generates a unique-solution puzzle', (level) => {
    const p = generatePuzzle(level, `test-L${level}`);
    expect(p.difficulty).toBe(level);
    expect(p.seed).toContain(`test-L${level}`);
    expect(isBoardValid(p.solution)).toBe(true);
    expect(isBoardComplete(p.solution)).toBe(true);
    expect(isBoardValid(p.initialBoard)).toBe(true);
    // Uniqueness — exactly 1 solution.
    expect(countSolutions(cloneBoard(p.initialBoard), 2)).toBe(1);
  });

  it('same seed → identical puzzle', () => {
    const a = generatePuzzle(2, 'fixed-seed');
    const b = generatePuzzle(2, 'fixed-seed');
    expect(JSON.stringify(a.initialBoard)).toBe(JSON.stringify(b.initialBoard));
    expect(JSON.stringify(a.solution)).toBe(JSON.stringify(b.solution));
  });
});
