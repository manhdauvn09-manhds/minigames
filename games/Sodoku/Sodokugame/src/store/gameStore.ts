// Game store — the live game state.
//
// Pure state mutations. No engine I/O lives here — UI components
// (Phase 4) call EngineClient.generate / .hint and then dispatch the
// store actions (`loadPuzzle`, `setHint`) with the result. Same for
// the timer: an effect in App.tsx will tick `tickTimer()` every
// second.
//
// Design notes:
//   - Notes are stored as Set<number>[][]. Persist middleware
//     converts them to flat number[][] on the way to localStorage.
//   - Move log is kept un-bounded for now; if memory becomes a
//     concern in long games the store can drop entries older than the
//     last placement.
//   - `mode` covers solo / daily / race; race-mode wires extra
//     callbacks (Phase 7B) but the core actions are identical.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  cloneBoard, computeAllCandidates, emptyBoard, emptyNotes, isBoardComplete,
} from '../core/validator';
import { BOARD_SIZE } from '../core/constants';
import type {
  Board, CellPosition, CellValue, GameMode, GameStatus, Move, Notes, Puzzle,
} from '../core/types';
import type { TechniqueResult } from '../core/techniques/types';

interface GameState {
  // ── Puzzle ──
  puzzle: Puzzle | null;
  board: Board;
  /** Cells that came as givens (immutable in UI). Lookup from
   * `puzzle.initialBoard`; cached here as a 81-flag Uint8Array for
   * O(1) "is this a given?" checks. */
  givens: Uint8Array;
  notes: Notes;

  // ── Selection / interaction ──
  selectedCell: CellPosition | null;
  /** When true, number-pad clicks toggle a note instead of placing. */
  pencilMode: boolean;

  // ── Move log ──
  moves: Move[];
  redoStack: Move[];

  // ── Run state ──
  mistakes: number;
  hintsUsed: number;
  /** Last hint result returned by the engine — kept so
   * "Apply hint" can act without another worker round-trip. */
  cachedHint: TechniqueResult | null;
  elapsedSeconds: number;
  status: GameStatus;
  isTimerRunning: boolean;
  mode: GameMode;

  // ── Actions ──
  loadPuzzle: (p: Puzzle, mode?: GameMode) => void;
  /** Reset to initial state of the current puzzle (keeps puzzle, drops
   * progress). */
  restart: () => void;
  /** Drop everything — for "back to menu". */
  clear: () => void;

  selectCell: (pos: CellPosition | null) => void;
  togglePencilMode: () => void;

  /** Place `value` (1..9) at the selected cell. No-op if no selection,
   * cell is a given, or pencil mode is on (use `toggleNote` instead). */
  placeValue: (value: number) => void;
  /** Toggle `value` in the note set of the selected cell. */
  toggleNote: (value: number) => void;
  /** Clear value + notes at the selected cell. */
  erase: () => void;
  /** Replace the cell's notes with the full candidate set
   * (used by the "auto-notes" affordance). */
  fillAutoNotes: (pos: CellPosition) => void;

  undo: () => void;
  redo: () => void;

  pause: () => void;
  resume: () => void;
  /** Called once per second by the UI's ticker effect while
   * `isTimerRunning && status === 'playing'`. */
  tickTimer: () => void;

  setHint: (h: TechniqueResult | null) => void;
  /** Apply the cached hint (single placement or multi-cell elimination)
   * to the board / notes. Increments `hintsUsed`. */
  applyHint: () => void;

  /** Race-mode — sets puzzle + transitions to playing without unwinding
   * any race-specific UI overlay (Phase 7B). */
  loadRacePuzzle: (p: Puzzle) => void;
}

function flagGivens(initial: Board): Uint8Array {
  const flags = new Uint8Array(BOARD_SIZE * BOARD_SIZE);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (initial[r][c] != null) flags[r * BOARD_SIZE + c] = 1;
    }
  }
  return flags;
}

const EMPTY_STATE = {
  puzzle: null as Puzzle | null,
  board: emptyBoard(),
  givens: new Uint8Array(BOARD_SIZE * BOARD_SIZE),
  notes: emptyNotes(),
  selectedCell: null as CellPosition | null,
  pencilMode: false,
  moves: [] as Move[],
  redoStack: [] as Move[],
  mistakes: 0,
  hintsUsed: 0,
  cachedHint: null as TechniqueResult | null,
  elapsedSeconds: 0,
  status: 'playing' as GameStatus,
  isTimerRunning: false,
  mode: 'solo' as GameMode,
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATE,

      loadPuzzle: (p, mode = 'solo') => {
        set({
          puzzle: p,
          board: cloneBoard(p.initialBoard),
          givens: flagGivens(p.initialBoard),
          notes: emptyNotes(),
          selectedCell: null,
          pencilMode: false,
          moves: [],
          redoStack: [],
          mistakes: 0,
          hintsUsed: 0,
          cachedHint: null,
          elapsedSeconds: 0,
          status: 'playing',
          isTimerRunning: true,
          mode,
        });
      },

      loadRacePuzzle: (p) => {
        get().loadPuzzle(p, 'race');
      },

      restart: () => {
        const p = get().puzzle;
        if (!p) return;
        get().loadPuzzle(p, get().mode);
      },

      clear: () => set({ ...EMPTY_STATE, board: emptyBoard(), notes: emptyNotes() }),

      selectCell: (pos) => set({ selectedCell: pos }),

      togglePencilMode: () => set((s) => ({ pencilMode: !s.pencilMode })),

      placeValue: (value) => {
        const s = get();
        const pos = s.selectedCell;
        if (!pos || s.status !== 'playing') return;
        const idx = pos.row * BOARD_SIZE + pos.col;
        if (s.givens[idx]) return;
        if (value < 1 || value > 9) return;

        if (s.pencilMode) {
          get().toggleNote(value);
          return;
        }

        const board = cloneBoard(s.board);
        const prevValue = board[pos.row][pos.col];
        const prevNotes = new Set(s.notes[pos.row][pos.col]);
        board[pos.row][pos.col] = value as CellValue;

        // Notes for this cell collapse to empty when a real value lands.
        const notes = s.notes.map((row, r) =>
          row.map((set_, c) => (r === pos.row && c === pos.col ? new Set<number>() : set_)),
        );

        // Mistake check — only when we have the full solution (solo + daily;
        // race ships the solution too).
        let mistakes = s.mistakes;
        let status: GameStatus = s.status;
        const sol = s.puzzle?.solution;
        if (sol && sol[pos.row][pos.col] !== value) {
          mistakes += 1;
        }

        const move: Move = {
          pos, type: 'place', value,
          prev: { value: prevValue, notes: prevNotes },
          timestamp: Date.now(),
        };

        if (isBoardComplete(board) && boardMatchesSolution(board, sol ?? null)) {
          status = 'won';
        }

        set({
          board, notes,
          moves: [...s.moves, move],
          redoStack: [],
          mistakes, status,
          isTimerRunning: status === 'playing',
        });
      },

      toggleNote: (value) => {
        const s = get();
        const pos = s.selectedCell;
        if (!pos || s.status !== 'playing') return;
        const idx = pos.row * BOARD_SIZE + pos.col;
        if (s.givens[idx]) return;
        if (value < 1 || value > 9) return;
        if (s.board[pos.row][pos.col] != null) return;

        const newNotes = s.notes.map((row, r) =>
          row.map((set_, c) => {
            if (r !== pos.row || c !== pos.col) return set_;
            const next = new Set(set_);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
          }),
        );

        const move: Move = {
          pos, type: 'note', value,
          prev: { value: s.board[pos.row][pos.col], notes: new Set(s.notes[pos.row][pos.col]) },
          timestamp: Date.now(),
        };
        set({ notes: newNotes, moves: [...s.moves, move], redoStack: [] });
      },

      erase: () => {
        const s = get();
        const pos = s.selectedCell;
        if (!pos || s.status !== 'playing') return;
        const idx = pos.row * BOARD_SIZE + pos.col;
        if (s.givens[idx]) return;

        const prevValue = s.board[pos.row][pos.col];
        const prevNotes = new Set(s.notes[pos.row][pos.col]);
        if (prevValue == null && prevNotes.size === 0) return;

        const board = cloneBoard(s.board);
        board[pos.row][pos.col] = null;
        const notes = s.notes.map((row, r) =>
          row.map((set_, c) => (r === pos.row && c === pos.col ? new Set<number>() : set_)),
        );

        const move: Move = {
          pos, type: 'erase', value: null,
          prev: { value: prevValue, notes: prevNotes },
          timestamp: Date.now(),
        };
        set({ board, notes, moves: [...s.moves, move], redoStack: [] });
      },

      fillAutoNotes: (pos) => {
        const s = get();
        if (s.board[pos.row][pos.col] != null) return;
        const all = computeAllCandidates(s.board);
        const candidates = all[pos.row][pos.col];
        const notes = s.notes.map((row, r) =>
          row.map((set_, c) => (r === pos.row && c === pos.col ? candidates : set_)),
        );
        set({ notes });
      },

      undo: () => {
        const s = get();
        if (s.moves.length === 0) return;
        const last = s.moves[s.moves.length - 1];
        const board = cloneBoard(s.board);
        const notes = s.notes.map((r) => r.map((set_) => new Set(set_)));
        board[last.pos.row][last.pos.col] = last.prev.value;
        notes[last.pos.row][last.pos.col] = new Set(last.prev.notes);
        set({
          board, notes,
          moves: s.moves.slice(0, -1),
          redoStack: [...s.redoStack, last],
          status: 'playing',
        });
      },

      redo: () => {
        const s = get();
        if (s.redoStack.length === 0) return;
        const next = s.redoStack[s.redoStack.length - 1];
        // Replay the move directly on the state — bypass action helpers
        // so we don't double-record.
        const board = cloneBoard(s.board);
        const notes = s.notes.map((r) => r.map((set_) => new Set(set_)));
        if (next.type === 'place') {
          board[next.pos.row][next.pos.col] = next.value as CellValue;
          notes[next.pos.row][next.pos.col] = new Set();
        } else if (next.type === 'erase') {
          board[next.pos.row][next.pos.col] = null;
          notes[next.pos.row][next.pos.col] = new Set();
        } else if (next.type === 'note' && next.value != null) {
          const cur = notes[next.pos.row][next.pos.col];
          if (cur.has(next.value)) cur.delete(next.value);
          else cur.add(next.value);
        }
        set({
          board, notes,
          moves: [...s.moves, next],
          redoStack: s.redoStack.slice(0, -1),
        });
      },

      pause: () => set({ status: 'paused', isTimerRunning: false }),
      resume: () => {
        if (get().status !== 'paused') return;
        set({ status: 'playing', isTimerRunning: true });
      },
      tickTimer: () => {
        const s = get();
        if (!s.isTimerRunning || s.status !== 'playing') return;
        set({ elapsedSeconds: s.elapsedSeconds + 1 });
      },

      setHint: (h) => set({ cachedHint: h }),

      applyHint: () => {
        const s = get();
        const h = s.cachedHint;
        if (!h) return;
        const board = cloneBoard(s.board);
        const notes = s.notes.map((r) => r.map((set_) => new Set(set_)));
        for (const p of h.placements) {
          board[p.pos.row][p.pos.col] = p.value as CellValue;
          notes[p.pos.row][p.pos.col] = new Set();
        }
        for (const e of h.eliminations) {
          const cur = notes[e.pos.row][e.pos.col];
          for (const v of e.values) cur.delete(v);
        }
        let status: GameStatus = s.status;
        const sol = s.puzzle?.solution;
        if (isBoardComplete(board) && boardMatchesSolution(board, sol ?? null)) {
          status = 'won';
        }
        set({
          board, notes,
          hintsUsed: s.hintsUsed + 1,
          cachedHint: null,
          status,
          isTimerRunning: status === 'playing',
        });
      },
    }),
    {
      name: 'sodoku.game.v1',
      // Persist enough to resume mid-game on next visit; drop the
      // hint cache + selectedCell since they're UI ephemera.
      partialize: (s) => ({
        puzzle: s.puzzle,
        board: s.board,
        givens: Array.from(s.givens),
        notes: serializeNotes(s.notes),
        moves: s.moves.map((m) => ({ ...m, prev: { value: m.prev.value, notes: [...m.prev.notes] } })),
        redoStack: s.redoStack.map((m) => ({ ...m, prev: { value: m.prev.value, notes: [...m.prev.notes] } })),
        mistakes: s.mistakes,
        hintsUsed: s.hintsUsed,
        elapsedSeconds: s.elapsedSeconds,
        status: s.status,
        mode: s.mode,
      }),
      // Custom storage so Set values round-trip cleanly.
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Rebuild Sets / Uint8Array from their serialised forms.
        if (Array.isArray(state.givens)) {
          state.givens = new Uint8Array(state.givens as unknown as number[]);
        }
        if (Array.isArray(state.notes) && state.notes.length === BOARD_SIZE
            && Array.isArray(state.notes[0]) && !((state.notes[0] as any)[0] instanceof Set)) {
          state.notes = (state.notes as unknown as number[][][]).map(
            (row) => row.map((arr) => new Set<number>(arr)),
          );
        }
        for (const m of [...(state.moves ?? []), ...(state.redoStack ?? [])]) {
          if (Array.isArray((m.prev as any).notes)) {
            (m.prev as any).notes = new Set<number>((m.prev as any).notes as number[]);
          }
        }
        // Resume paused (operator wasn't here to dismiss the modal).
        if (state.status === 'playing') {
          state.isTimerRunning = false;
          state.status = 'paused';
        }
      },
      version: 1,
    },
  ),
);

function boardMatchesSolution(board: Board, sol: Board | null): boolean {
  if (!sol) return false;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== sol[r][c]) return false;
    }
  }
  return true;
}

function serializeNotes(notes: Notes): number[][][] {
  return notes.map((row) => row.map((set_) => [...set_].sort((a, b) => a - b)));
}
