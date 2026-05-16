// English locale stub — Phase 4 will fill these. Keys must match
// `Strings` type from vi.ts.

import type { Strings } from './vi';

export const en: Strings = {
  app: { title: 'Sudoku', tagline: 'Sudoku 9x9 — plays in your browser' },
  difficulty: {
    label: 'Difficulty',
    1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert', 5: 'Master',
  },
  game: {
    newGame: 'New game', pause: 'Pause', resume: 'Resume',
    hint: 'Hint', undo: 'Undo', redo: 'Redo', notes: 'Notes',
    erase: 'Erase', timer: 'Time', mistakes: 'Mistakes',
    hintsUsed: 'Hints used',
    won: 'You won!', lost: 'No mistakes left',
    dailyChallenge: 'Daily challenge', leaderboard: 'Leaderboard',
  },
  auth: { notSignedIn: 'Not signed in', signIn: 'Sign in', signOut: 'Sign out' },
  theme: { label: 'Theme', light: 'Light', dark: 'Dark', auto: 'Auto' },
  errors: {
    generic: 'Something went wrong. Please try again.',
    network: 'Network error. Retrying…',
    invalidPuzzle: 'Invalid puzzle.',
  },
};
