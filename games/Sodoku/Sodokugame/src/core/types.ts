// Sodoku core domain types — pure, no React/DOM imports.
//
// Phase 1 establishes the type contract; Phase 2 fills validator/solver/
// generator implementations against these types. Anything UI-related
// lives in src/store/ or src/components/ and is forbidden here.

export type CellValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null;
export type Board = CellValue[][]; // 9x9
export type Notes = Set<number>[][]; // candidate sets per cell

export interface CellPosition {
  row: number;
  col: number;
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

// Solving techniques — ordered roughly by ascending difficulty.
// `TECHNIQUES_BY_DIFFICULTY` in src/core/techniques/index.ts (Phase 2)
// re-exports them with their `find` implementations and locale strings.
export enum Technique {
  NAKED_SINGLE = 'NAKED_SINGLE',
  HIDDEN_SINGLE = 'HIDDEN_SINGLE',
  NAKED_PAIR = 'NAKED_PAIR',
  HIDDEN_PAIR = 'HIDDEN_PAIR',
  NAKED_TRIPLE = 'NAKED_TRIPLE',
  HIDDEN_TRIPLE = 'HIDDEN_TRIPLE',
  POINTING_PAIR = 'POINTING_PAIR',
  BOX_LINE_REDUCTION = 'BOX_LINE_REDUCTION',
  X_WING = 'X_WING',
  SWORDFISH = 'SWORDFISH',
  XY_WING = 'XY_WING',
}

export interface SolveStep {
  technique: Technique;
  cells: CellPosition[];
  // Cells whose candidate sets shrink because of this step.
  eliminations: { pos: CellPosition; values: number[] }[];
  // Cells that get a confirmed value because of this step.
  placements: { pos: CellPosition; value: number }[];
  reason: string; // localised explanation, set at render time
}

export interface Puzzle {
  initialBoard: Board; // givens (immutable cells)
  solution: Board; // canonical solution
  difficulty: DifficultyLevel;
  hardestTechnique: Technique;
  seed: string; // for daily challenge / reproducibility
  generatedAt: string; // ISO8601
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost';
export type GameMode = 'solo' | 'daily' | 'race';

export interface Move {
  pos: CellPosition;
  type: 'place' | 'note' | 'erase';
  // For 'place'/'erase': the value placed/cleared.
  // For 'note': the note value toggled.
  value: number | null;
  // For undo: the previous cell state to restore.
  prev: { value: CellValue; notes: Set<number> };
  timestamp: number; // ms since epoch
}

// Portal user — comes from the parent auth endpoint (Phase 3).
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// Phase 7A — leaderboard wire format.
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  level: DifficultyLevel;
  timeSeconds: number;
  mistakes: number;
  isFlawless: boolean;
  createdAt: string;
}

// Phase 7B — multiplayer race state.
export interface MatchState {
  matchId: string;
  roomCode: string;
  level: DifficultyLevel;
  status: 'waiting' | 'active' | 'finished' | 'abandoned';
  participants: {
    userId: string;
    displayName: string;
    progress: number; // 0..1, % of cells filled
    finishTimeSeconds: number | null;
    finishRank: number | null;
    mistakes: number;
  }[];
  puzzle: Puzzle | null;
  startedAt: string | null;
}
