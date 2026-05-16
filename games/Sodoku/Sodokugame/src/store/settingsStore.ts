// Settings store — user preferences. Persisted to localStorage so the
// next visit keeps theme + language + audio choices.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_MISTAKE_LIMIT } from '../core/constants';

export type ThemePref = 'light' | 'dark' | 'auto';
export type LangPref = 'vi' | 'en' | 'ja';

interface SettingsState {
  theme: ThemePref;
  lang: LangPref;
  /** Sound effects on cell click + win. */
  soundOn: boolean;
  /** Auto-fill notes for empty cells when "Notes" mode is toggled. */
  autoNotes: boolean;
  /** Highlight cells sharing a row/col/box with the selected cell. */
  highlightPeers: boolean;
  /** Highlight cells with the same value as the selected cell. */
  highlightSameValue: boolean;
  /** Show a red flash for an incorrect placement (vs the solution). */
  showMistakes: boolean;
  /** End the game after this many mistakes. 0 = unlimited. */
  mistakeLimit: number;

  setTheme: (t: ThemePref) => void;
  setLang: (l: LangPref) => void;
  toggleSound: () => void;
  toggleAutoNotes: () => void;
  toggleHighlightPeers: () => void;
  toggleHighlightSameValue: () => void;
  toggleShowMistakes: () => void;
  setMistakeLimit: (n: number) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme: 'auto' as ThemePref,
  lang: 'vi' as LangPref,
  soundOn: true,
  autoNotes: false,
  highlightPeers: true,
  highlightSameValue: true,
  showMistakes: true,
  mistakeLimit: DEFAULT_MISTAKE_LIMIT,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleAutoNotes: () => set((s) => ({ autoNotes: !s.autoNotes })),
      toggleHighlightPeers: () => set((s) => ({ highlightPeers: !s.highlightPeers })),
      toggleHighlightSameValue: () => set((s) => ({ highlightSameValue: !s.highlightSameValue })),
      toggleShowMistakes: () => set((s) => ({ showMistakes: !s.showMistakes })),
      setMistakeLimit: (mistakeLimit) =>
        set({ mistakeLimit: Math.max(0, Math.min(99, Math.trunc(mistakeLimit))) }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'sodoku.settings.v1',
      // Only persist the leaf values, not the action functions.
      partialize: (s) => ({
        theme: s.theme, lang: s.lang, soundOn: s.soundOn,
        autoNotes: s.autoNotes, highlightPeers: s.highlightPeers,
        highlightSameValue: s.highlightSameValue, showMistakes: s.showMistakes,
        mistakeLimit: s.mistakeLimit,
      }),
      version: 1,
    },
  ),
);
