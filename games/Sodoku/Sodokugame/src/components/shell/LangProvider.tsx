import { type ReactNode, useEffect } from 'react';
import { useSettingsStore } from '../../store';
import { vi } from '../../locales/vi';
import { en } from '../../locales/en';
import { ja } from '../../locales/ja';
import { StringsContext } from '../../hooks/useStrings';

const STRINGS = { vi, en, ja } as const;

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSettingsStore((s) => s.lang);
  const strings = STRINGS[lang] ?? vi;

  // Update <html lang="..."> too — accessibility + SEO.
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  return <StringsContext.Provider value={strings}>{children}</StringsContext.Provider>;
}
