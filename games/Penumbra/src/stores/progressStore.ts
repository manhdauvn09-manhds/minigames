"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProgressState {
  bestStars: Record<string, number>;
  hintBalance: number;
  lastDailyDate: string | null;
  streak: number;

  setBestStars: (id: string, stars: number) => void;
  spendHint: (cost: number) => boolean;
  earnHint: (n: number) => void;
  recordDailySolve: (dateISO: string) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      bestStars: {},
      hintBalance: 3,
      lastDailyDate: null,
      streak: 0,

      setBestStars(id, stars) {
        const current = get().bestStars[id] ?? 0;
        if (stars > current) {
          set({ bestStars: { ...get().bestStars, [id]: stars } });
          if (stars === 3) {
            // 3-star earns 1 hint per spec.hintSystem.earnSources.threeStar.
            set({ hintBalance: Math.min(20, get().hintBalance + 1) });
          }
        }
      },

      spendHint(cost) {
        if (get().hintBalance < cost) return false;
        set({ hintBalance: get().hintBalance - cost });
        return true;
      },

      earnHint(n) {
        set({ hintBalance: Math.min(20, get().hintBalance + n) });
      },

      recordDailySolve(dateISO) {
        const last = get().lastDailyDate;
        if (last === dateISO) return; // already counted
        const yesterday = new Date(dateISO + "T00:00:00Z");
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yISO = yesterday.toISOString().slice(0, 10);
        const newStreak = last === yISO ? get().streak + 1 : 1;
        set({ lastDailyDate: dateISO, streak: newStreak });
      },
    }),
    { name: "penumbra-progress" },
  ),
);
