// Achievement state — unlocked IDs + a transient queue of "just-
// unlocked" entries the toast UI consumes and dismisses.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AchievementDef } from '../core/achievements';

interface AchievementsState {
  unlocked: string[]; // ids; persisted as array, exposed via .has-style helpers
  /** Queue for the toast component. NOT persisted — survives page
   * lifetime only so a refresh doesn't replay old toasts. */
  toastQueue: AchievementDef[];

  isUnlocked: (id: string) => boolean;
  unlockMany: (defs: AchievementDef[]) => void;
  shiftToast: () => AchievementDef | null;
  reset: () => void;
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      unlocked: [],
      toastQueue: [],

      isUnlocked: (id) => get().unlocked.includes(id),

      unlockMany: (defs) => {
        if (defs.length === 0) return;
        const cur = new Set(get().unlocked);
        const fresh = defs.filter((d) => !cur.has(d.id));
        if (fresh.length === 0) return;
        set({
          unlocked: [...get().unlocked, ...fresh.map((d) => d.id)],
          toastQueue: [...get().toastQueue, ...fresh],
        });
      },

      shiftToast: () => {
        const q = get().toastQueue;
        if (q.length === 0) return null;
        const [head, ...rest] = q;
        set({ toastQueue: rest });
        return head;
      },

      reset: () => set({ unlocked: [], toastQueue: [] }),
    }),
    {
      name: 'sodoku.achievements.v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Toast queue is ephemeral.
      partialize: (s) => ({ unlocked: s.unlocked }),
    },
  ),
);
