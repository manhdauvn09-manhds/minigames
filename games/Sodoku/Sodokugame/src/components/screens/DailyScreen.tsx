import { useState } from 'react';
import { useGameStore } from '../../store';
import { useDailyStore, todayKey } from '../../store/dailyStore';
import { useEngine } from '../../hooks/useEngine';
import { useNavigation } from '../../hooks/useNavigation';
import { useStrings } from '../../hooks/useStrings';
import { Button } from '../ui/Button';
import { ChevronLeft, Flame, Calendar } from 'lucide-react';
import { dailySeed } from '../../core/random';
import type { DifficultyLevel } from '../../core/types';

const DAILY_LEVEL: DifficultyLevel = 3;

function fmtTime(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function DailyScreen() {
  const t = useStrings();
  const { go } = useNavigation();
  const engine = useEngine();
  const history = useDailyStore((s) => s.history);
  const currentStreak = useDailyStore((s) => s.currentStreak);
  const longestStreak = useDailyStore((s) => s.longestStreak);
  const [busy, setBusy] = useState(false);

  const today = todayKey();
  const todayEntry = history[today];

  async function play(): Promise<void> {
    setBusy(true);
    try {
      const seed = dailySeed(new Date());
      const p = await engine.generate(DAILY_LEVEL, { seed });
      useGameStore.getState().loadPuzzle(p, 'daily');
      go('game');
    } finally {
      setBusy(false);
    }
  }

  // Last 7 days as a strip.
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (6 - i));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    return { key, label: `${day}/${m}`, done: !!history[key] };
  });

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg p-4 gap-6 max-w-md mx-auto w-full">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => go('home')}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="font-serif text-2xl">{t.game.dailyChallenge}</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-elevated rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-accent">
            <Flame size={20} />
            <span className="text-3xl font-mono tabular-nums">{currentStreak}</span>
          </div>
          <p className="text-xs text-fg-subtle mt-1">Current streak</p>
        </div>
        <div className="bg-bg-elevated rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-fg">
            <Calendar size={20} />
            <span className="text-3xl font-mono tabular-nums">{longestStreak}</span>
          </div>
          <p className="text-xs text-fg-subtle mt-1">Longest</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-fg-subtle text-xs uppercase tracking-widest">Last 7 days</h2>
        <div className="grid grid-cols-7 gap-1">
          {last7.map((d) => (
            <div
              key={d.key}
              className={`aspect-square rounded text-[10px] flex flex-col items-center justify-center
                ${d.done ? 'bg-accent text-white' : 'bg-bg-elevated text-fg-subtle border border-border'}`}
              title={d.key}
            >
              <span>{d.label}</span>
              {d.done && <span>✓</span>}
            </div>
          ))}
        </div>
      </section>

      {todayEntry ? (
        <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
          <p className="text-fg-muted text-sm">Today's puzzle complete!</p>
          <div className="flex justify-around text-center">
            <div>
              <div className="font-mono text-xl">{fmtTime(todayEntry.timeSeconds)}</div>
              <div className="text-xs text-fg-subtle">{t.game.timer}</div>
            </div>
            <div>
              <div className="font-mono text-xl">{todayEntry.mistakes}</div>
              <div className="text-xs text-fg-subtle">{t.game.mistakes}</div>
            </div>
            <div>
              <div className="font-mono text-xl">{todayEntry.hintsUsed}</div>
              <div className="text-xs text-fg-subtle">{t.game.hintsUsed}</div>
            </div>
          </div>
          <Button variant="secondary" onClick={play} disabled={busy} className="w-full">
            Play again (no streak credit)
          </Button>
        </div>
      ) : (
        <Button variant="primary" size="lg" onClick={play} disabled={busy} className="w-full">
          {busy ? 'Generating…' : `Start today's puzzle (${todayKey()})`}
        </Button>
      )}
    </div>
  );
}
