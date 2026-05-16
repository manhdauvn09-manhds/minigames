// Sodoku core constants — pure data, no React/DOM imports.
//
// Difficulty config drives both the generator (how many clues to leave +
// hardest technique allowed) and the UI (display name, color accent).

import type { DifficultyLevel } from './types';
import { Technique } from './types';

export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;
export const DEFAULT_MISTAKE_LIMIT = 3;

export interface DifficultyConfig {
  level: DifficultyLevel;
  name: string;        // English (canonical)
  nameVi: string;
  nameJa: string;
  // Inclusive clue range — generator tries to leave a count in [min,max].
  clueRange: { min: number; max: number };
  // Hardest technique permitted by the generator at this level.
  maxTechnique: Technique;
  // Hex color for badges; mirrors the design tokens.
  color: string;
}

export const DIFFICULTY_CONFIG: Record<DifficultyLevel, DifficultyConfig> = {
  1: {
    level: 1, name: 'Easy', nameVi: 'Dễ', nameJa: 'やさしい',
    clueRange: { min: 36, max: 45 },
    maxTechnique: Technique.HIDDEN_SINGLE,
    color: '#5B8C5A',
  },
  2: {
    level: 2, name: 'Medium', nameVi: 'Vừa', nameJa: 'ふつう',
    clueRange: { min: 30, max: 35 },
    maxTechnique: Technique.NAKED_PAIR,
    color: '#3F7CAC',
  },
  3: {
    level: 3, name: 'Hard', nameVi: 'Khó', nameJa: 'むずかしい',
    clueRange: { min: 26, max: 29 },
    maxTechnique: Technique.POINTING_PAIR,
    color: '#C97B36',
  },
  4: {
    level: 4, name: 'Expert', nameVi: 'Chuyên gia', nameJa: 'エキスパート',
    clueRange: { min: 22, max: 25 },
    maxTechnique: Technique.X_WING,
    color: '#A63C28',
  },
  5: {
    level: 5, name: 'Master', nameVi: 'Bậc thầy', nameJa: 'マスター',
    clueRange: { min: 20, max: 22 },
    maxTechnique: Technique.XY_WING,
    color: '#5C2A6E',
  },
};

// Keyboard shortcuts — defined here so the same set drives both the
// keydown handler (Phase 4) and the help modal listing.
export const KEYBOARD_SHORTCUTS = {
  numbers: '1-9',          // place value
  erase: 'Backspace',
  noteToggle: 'N',
  hint: 'H',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Shift+Z',
  pause: 'Space',
  navigation: 'Arrow keys',
} as const;

// Where the Sodoku frontend talks to the parent portal services.
// Kept in one place so Phase 7 (backend) can flip endpoints between
// staging / prod via a single edit. ENV vars override at build time.
//
// Reads via optional chaining so the same module loads in plain Node
// (tsx scripts, vitest) where `import.meta.env` is undefined.
const _env: Record<string, string | undefined> = (import.meta as any).env ?? {};

// AllIn1Site split: race backend lives on the same subdomain as the
// FE (sodoku.allin1site.com); nginx proxies /api/sudoku/* to the
// SodokuBackend container. The race WebSocket URL is the only one
// actually consumed today (via lib/race.ts → defaultRaceUrl()); the
// AUTH/LOGOUT/REST entries below are placeholder Phase 7A
// scaffolding — auth.ts treats a 401/network failure as guest mode,
// so these can stay as no-op defaults until a real auth surface
// lands somewhere on the AllIn1Site stack.
export const PORTAL_CONFIG = {
  AUTH_ENDPOINT:
    _env.VITE_AUTH_ENDPOINT ?? 'https://allin1site.com/auth/me',
  LOGOUT_ENDPOINT:
    _env.VITE_LOGOUT_ENDPOINT ?? 'https://allin1site.com/auth/logout',
  // Phase 7A: Sudoku REST API. nginx routes /api/sudoku/* on
  // sodoku.allin1site.com to the SodokuBackend container, so the
  // base URL is just the FE subdomain — callers append the route
  // (e.g. `${BACKEND_BASE}/api/sudoku/leaderboard`).
  BACKEND_BASE:
    _env.VITE_BACKEND_BASE ?? 'https://sodoku.allin1site.com',
  // Phase 7B: WebSocket endpoint base. The actual race URL used is
  // built by `defaultRaceUrl()` in `lib/race.ts`; this entry is kept
  // for future REST clients that might want a base URL only.
  SOCKET_URL:
    _env.VITE_SOCKET_URL ?? 'wss://sodoku.allin1site.com',
} as const;
