import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../gameStore';
import { generatePuzzle } from '../../core/generator';
import type { Puzzle } from '../../core/types';

function fresh(): Puzzle {
  return generatePuzzle(1, 'gameStore-test-fixture');
}

beforeEach(() => {
  // Wipe localStorage so persist middleware doesn't leak state between tests.
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useGameStore.getState().clear();
});

describe('gameStore — load + select', () => {
  it('loadPuzzle initialises board, givens, notes', () => {
    const p = fresh();
    useGameStore.getState().loadPuzzle(p);
    const s = useGameStore.getState();
    expect(s.puzzle).toBe(p);
    expect(s.status).toBe('playing');
    expect(s.isTimerRunning).toBe(true);
    expect(s.elapsedSeconds).toBe(0);
    expect(s.mistakes).toBe(0);
    // Givens flagged for non-null cells in initialBoard.
    let givenCount = 0;
    for (let i = 0; i < 81; i++) if (s.givens[i]) givenCount++;
    const expected = p.initialBoard.flat().filter((v) => v != null).length;
    expect(givenCount).toBe(expected);
  });

  it('selectCell updates the selection', () => {
    useGameStore.getState().loadPuzzle(fresh());
    useGameStore.getState().selectCell({ row: 4, col: 4 });
    expect(useGameStore.getState().selectedCell).toEqual({ row: 4, col: 4 });
    useGameStore.getState().selectCell(null);
    expect(useGameStore.getState().selectedCell).toBeNull();
  });
});

describe('gameStore — placeValue', () => {
  it('places value at selected non-given cell', () => {
    const p = fresh();
    useGameStore.getState().loadPuzzle(p);
    // Find an empty cell.
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    useGameStore.getState().selectCell({ row: r, col: c });
    const correct = p.solution[r][c]!;
    useGameStore.getState().placeValue(correct);
    expect(useGameStore.getState().board[r][c]).toBe(correct);
    expect(useGameStore.getState().mistakes).toBe(0);
  });

  it('increments mistakes on wrong placement', () => {
    const p = fresh();
    useGameStore.getState().loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    useGameStore.getState().selectCell({ row: r, col: c });
    const correct = p.solution[r][c]!;
    const wrong = correct === 1 ? 2 : 1;
    useGameStore.getState().placeValue(wrong);
    expect(useGameStore.getState().mistakes).toBe(1);
  });

  it('refuses to write into a given cell', () => {
    const p = fresh();
    useGameStore.getState().loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] != null) { r = i; c = j; break outer; }
    }
    const original = p.initialBoard[r][c];
    useGameStore.getState().selectCell({ row: r, col: c });
    useGameStore.getState().placeValue(((original as number) % 9) + 1);
    expect(useGameStore.getState().board[r][c]).toBe(original);
  });
});

describe('gameStore — undo / redo', () => {
  it('undo reverses last placement', () => {
    const p = fresh();
    const s = useGameStore.getState();
    s.loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    s.selectCell({ row: r, col: c });
    s.placeValue(p.solution[r][c]!);
    expect(useGameStore.getState().board[r][c]).toBe(p.solution[r][c]);
    useGameStore.getState().undo();
    expect(useGameStore.getState().board[r][c]).toBeNull();
    expect(useGameStore.getState().redoStack.length).toBe(1);
  });

  it('redo replays an undone move', () => {
    const p = fresh();
    const s = useGameStore.getState();
    s.loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    s.selectCell({ row: r, col: c });
    const v = p.solution[r][c]!;
    s.placeValue(v);
    useGameStore.getState().undo();
    useGameStore.getState().redo();
    expect(useGameStore.getState().board[r][c]).toBe(v);
  });
});

describe('gameStore — notes', () => {
  it('toggleNote adds + removes from cell note set', () => {
    const p = fresh();
    const s = useGameStore.getState();
    s.loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    s.selectCell({ row: r, col: c });
    s.toggleNote(5);
    expect(useGameStore.getState().notes[r][c].has(5)).toBe(true);
    useGameStore.getState().toggleNote(5);
    expect(useGameStore.getState().notes[r][c].has(5)).toBe(false);
  });

  it('placeValue clears notes on that cell', () => {
    const p = fresh();
    const s = useGameStore.getState();
    s.loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    s.selectCell({ row: r, col: c });
    s.toggleNote(3);
    s.toggleNote(7);
    expect(useGameStore.getState().notes[r][c].size).toBe(2);
    useGameStore.getState().placeValue(p.solution[r][c]!);
    expect(useGameStore.getState().notes[r][c].size).toBe(0);
  });
});

describe('gameStore — pause / resume / timer', () => {
  it('pause stops timer', () => {
    useGameStore.getState().loadPuzzle(fresh());
    useGameStore.getState().pause();
    const s = useGameStore.getState();
    expect(s.status).toBe('paused');
    expect(s.isTimerRunning).toBe(false);
  });

  it('tickTimer increments only while playing', () => {
    useGameStore.getState().loadPuzzle(fresh());
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().elapsedSeconds).toBe(1);
    useGameStore.getState().pause();
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().elapsedSeconds).toBe(1);
    useGameStore.getState().resume();
    useGameStore.getState().tickTimer();
    expect(useGameStore.getState().elapsedSeconds).toBe(2);
  });
});

describe('gameStore — completion', () => {
  it('detects win when board matches solution', () => {
    const p = fresh();
    useGameStore.getState().loadPuzzle(p);
    // Fill in every empty cell with the correct solution.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (p.initialBoard[r][c] == null) {
          useGameStore.getState().selectCell({ row: r, col: c });
          useGameStore.getState().placeValue(p.solution[r][c]!);
        }
      }
    }
    const final = useGameStore.getState();
    expect(final.status).toBe('won');
    expect(final.isTimerRunning).toBe(false);
  });
});

describe('gameStore — restart / clear', () => {
  it('restart resets progress but keeps puzzle', () => {
    const p = fresh();
    const s = useGameStore.getState();
    s.loadPuzzle(p);
    let r = -1, c = -1;
    outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
      if (p.initialBoard[i][j] == null) { r = i; c = j; break outer; }
    }
    s.selectCell({ row: r, col: c });
    s.placeValue(p.solution[r][c]!);
    useGameStore.getState().restart();
    const final = useGameStore.getState();
    expect(final.puzzle).toBe(p);
    expect(final.board[r][c]).toBeNull();
    expect(final.moves.length).toBe(0);
    expect(final.elapsedSeconds).toBe(0);
  });
});
