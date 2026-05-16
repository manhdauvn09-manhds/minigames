import { createContext, useContext } from 'react';
import { vi, type Strings } from '../locales/vi';

// Strings are provided by <LangProvider>; falls back to vi if accessed
// outside the provider (e.g. unit tests rendering a component bare).
export const StringsContext = createContext<Strings>(vi);

export function useStrings(): Strings {
  return useContext(StringsContext);
}
