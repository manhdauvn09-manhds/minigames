import { useEffect, type ReactNode } from 'react';
import { useSettingsStore } from '../../store';

/** Mirrors `settingsStore.theme` to `<html data-theme="...">`. The
 * actual color application happens in CSS via the `[data-theme]`
 * selector — this provider is just the synchroniser. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return <>{children}</>;
}
