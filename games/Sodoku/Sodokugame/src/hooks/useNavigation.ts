import { createContext, useContext } from 'react';

export type Screen =
  | 'home' | 'game' | 'stats' | 'settings' | 'daily'
  | 'race' | 'raceResults';

export interface Nav {
  screen: Screen;
  go: (s: Screen) => void;
}

export const NavContext = createContext<Nav>({
  screen: 'home',
  go: () => { /* no-op default — overridden by App */ },
});

export function useNavigation(): Nav {
  return useContext(NavContext);
}
