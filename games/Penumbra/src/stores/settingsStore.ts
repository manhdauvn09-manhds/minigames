"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Locale = "vi" | "en" | "ja";

interface SettingsState {
  locale: Locale;
  soundEnabled: boolean;
  colorblindMode: boolean;
  setLocale: (l: Locale) => void;
  toggleSound: () => void;
  toggleColorblind: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      locale: "vi",
      soundEnabled: true,
      colorblindMode: false,
      setLocale(l) {
        set({ locale: l });
      },
      toggleSound() {
        set({ soundEnabled: !get().soundEnabled });
      },
      toggleColorblind() {
        set({ colorblindMode: !get().colorblindMode });
      },
    }),
    { name: "penumbra-settings" },
  ),
);
