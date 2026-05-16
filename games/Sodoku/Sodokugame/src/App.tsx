import { useEffect, useState, useMemo } from 'react';
import { ThemeProvider } from './components/shell/ThemeProvider';
import { LangProvider } from './components/shell/LangProvider';
import { EngineProvider } from './components/shell/EngineProvider';
import { NavContext, type Screen } from './hooks/useNavigation';
import { HomeScreen } from './components/screens/HomeScreen';
import { GameScreen } from './components/screens/GameScreen';
import { StatsScreen } from './components/screens/StatsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { DailyScreen } from './components/screens/DailyScreen';
import { RaceLobbyScreen } from './components/screens/RaceLobbyScreen';
import { RaceResultsScreen } from './components/screens/RaceResultsScreen';
import { AchievementToast } from './components/modals/AchievementToast';
import { useAuthStore } from './store';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => { void fetchUser(); }, [fetchUser]);

  const nav = useMemo(() => ({ screen, go: setScreen }), [screen]);

  return (
    <ThemeProvider>
      <LangProvider>
        <EngineProvider>
          <NavContext.Provider value={nav}>
            {screen === 'home' && <HomeScreen />}
            {screen === 'game' && <GameScreen />}
            {screen === 'stats' && <StatsScreen />}
            {screen === 'settings' && <SettingsScreen />}
            {screen === 'daily' && <DailyScreen />}
            {screen === 'race' && <RaceLobbyScreen />}
            {screen === 'raceResults' && <RaceResultsScreen />}
            <AchievementToast />
          </NavContext.Provider>
        </EngineProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
