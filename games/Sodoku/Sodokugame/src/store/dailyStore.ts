// Daily challenge tracking — persisted local history of finished
// daily puzzles. The actual daily puzzle generation lives in
// HomeScreen/dailyChallenge() (uses `dailySeed(today)` as the
// deterministic seed); this store just remembers WHO finished WHAT
// WHEN, so the UI can render "current streak: 5 days" and the WinModal
// knows whether to mark today as done.
//
// Phase 7A backend will mirror this state server-side; until then the
// data is purely local.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface DailyEntry {
  /** Local date key, format YYYY-MM-DD (UTC). Same key the engine's
   * `dailySeed(date)` derives from. */
  date: string;
  timeSeconds: number;
  mistakes: number;
  hintsUsed: number;
  /** ISO timestamp when finished — for ordering / display. */
  finishedAt: string;
}

interface DailyState {
  /** date → entry, single attempt per day stored. Re-finishing same
   * date overwrites with the better time (mistake-free wins ties). */
  history: Record<string, DailyEntry>;
  currentStreak: number;
  longestStreak: number;

  recordFinish: (entry: DailyEntry) => void;
  isDateComplete: (dateKey: string) => boolean;
  reset: () => void;
}

export function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateKeyDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Walk back from today, count consecutive days present in `history`.
 * Today not yet finished counts as 0; finishing today bumps to 1. */
function computeStreak(history: Record<string, DailyEntry>): number {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    if (history[dateKeyDaysAgo(i)]) n++;
    else break;
  }
  return n;
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      history: {},
      currentStreak: 0,
      longestStreak: 0,

      recordFinish: (entry) => {
        const prev = get().history[entry.date];
        // Keep the better attempt: fewer mistakes wins, then faster.
        const keepNew = !prev
          || entry.mistakes < prev.mistakes
          || (entry.mistakes === prev.mistakes && entry.timeSeconds < prev.timeSeconds);
        const history = { ...get().history };
        if (keepNew) history[entry.date] = entry;
        const currentStreak = computeStreak(history);
        const longestStreak = Math.max(get().longestStreak, currentStreak);
        set({ history, currentStreak, longestStreak });
      },

      isDateComplete: (dateKey) => !!get().history[dateKey],

      reset: () => set({ history: {}, currentStreak: 0, longestStreak: 0 }),
    }),
    {
      name: 'sodoku.daily.v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // On rehydrate, recompute the streak from history (in case the
      // user returned after several days off — the persisted streak
      // would be stale).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.currentStreak = computeStreak(state.history);
      },
    },
  ),
);
