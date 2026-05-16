import { useState } from 'react';
import { useGameStore } from '../../store';
import { useDailyStore } from '../../store/dailyStore';
import { useEngine } from '../../hooks/useEngine';
import { useNavigation } from '../../hooks/useNavigation';
import { useStrings } from '../../hooks/useStrings';
import { DifficultyPicker } from '../controls/DifficultyPicker';
import { Button } from '../ui/Button';
import { Flame } from 'lucide-react';
import type { DifficultyLevel } from '../../core/types';

export function HomeScreen() {
  const t = useStrings();
  const { go } = useNavigation();
  const engine = useEngine();
  const puzzle = useGameStore((s) => s.puzzle);
  const status = useGameStore((s) => s.status);
  const streak = useDailyStore((s) => s.currentStreak);
  const [busy, setBusy] = useState<DifficultyLevel | 'daily' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function newGame(level: DifficultyLevel): Promise<void> {
    setBusy(level); setError(null);
    try {
      const p = await engine.generate(level);
      useGameStore.getState().loadPuzzle(p);
      go('game');
    } catch (e) {
      setError(t.errors.generic);
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  const canResume = puzzle != null && (status === 'paused' || status === 'playing');

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-8 gap-6 bg-bg text-fg">
      <header className="text-center space-y-1 mt-6 sm:mt-0">
        <h1 className="font-serif text-5xl sm:text-6xl tracking-tight">{t.app.title}</h1>
        <p className="text-fg-muted">{t.app.tagline}</p>
      </header>

      {canResume && (
        <Button variant="primary" size="lg" onClick={() => go('game')}>
          ▶ {t.game.resume}
        </Button>
      )}

      <section className="w-full max-w-md space-y-3">
        <h2 className="text-fg-subtle text-sm uppercase tracking-widest text-center">
          {t.difficulty.label}
        </h2>
        <DifficultyPicker onPick={newGame} disabled={busy != null} />
      </section>

      <section className="w-full max-w-md flex flex-col gap-2">
        <Button
          variant="secondary" size="md"
          onClick={() => go('daily')}
          disabled={busy != null}
          className="justify-between"
        >
          <span className="flex items-center gap-2">🗓 {t.game.dailyChallenge}</span>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <Flame size={14} />
              {streak}
            </span>
          )}
        </Button>
        <Button
          variant="secondary" size="md"
          onClick={() => go('race')}
          disabled={busy != null}
        >
          ⚔ Multiplayer race (2 players)
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => go('stats')} className="flex-1">
            📊 {t.game.leaderboard}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => go('settings')} className="flex-1">
            ⚙ Settings
          </Button>
        </div>
      </section>

      {busy != null && (
        <p className="text-fg-muted text-sm">Generating puzzle…</p>
      )}
      {error && <p className="text-loss text-sm">{error}</p>}

      <footer className="text-fg-subtle text-xs mt-auto pt-8">
        sodoku.allin1site.com · v0.1.0-phase4
      </footer>
    </div>
  );
}
