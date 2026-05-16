import { useEffect } from 'react';
import { useRaceStore } from '../../store/raceStore';
import { useNavigation } from '../../hooks/useNavigation';
import { Button } from '../ui/Button';
import { Trophy } from 'lucide-react';
import type { RaceClient } from '../../lib/race';

function fmtTime(s: number | null): string {
  if (s == null) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function RaceResultsScreen() {
  const { go } = useNavigation();
  const myUserId = useRaceStore((s) => s.myUserId);
  const participants = useRaceStore((s) => s.participants);

  // Tear down the WebSocket on enter — match is over.
  useEffect(() => {
    const c: RaceClient | null = (window as any).__raceClient ?? null;
    c?.send({ type: 'leave' });
    c?.close();
    (window as any).__raceClient = null;
  }, []);

  // Sort by finishRank (nulls = DNF go last).
  const sorted = [...participants].sort((a, b) => {
    if (a.finishRank == null) return 1;
    if (b.finishRank == null) return -1;
    return a.finishRank - b.finishRank;
  });

  const myEntry = participants.find((p) => p.userId === myUserId);
  const won = myEntry?.finishRank === 1;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg p-4 gap-6 max-w-md mx-auto w-full justify-center">
      <header className="text-center space-y-2">
        <Trophy size={48} className="mx-auto text-accent" />
        <h1 className="font-serif text-3xl">{won ? 'You won!' : 'Match over'}</h1>
        <p className="text-fg-muted">Final standings</p>
      </header>

      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.userId}
            className={`flex items-center justify-between bg-bg-elevated rounded-md p-3 border
              ${i === 0 ? 'border-accent' : 'border-border'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono w-8 text-center">
                {p.finishRank ? `#${p.finishRank}` : '—'}
              </span>
              <div>
                <p className="font-medium">
                  {p.name}
                  {p.userId === myUserId && <span className="text-fg-subtle text-xs"> (you)</span>}
                </p>
                <p className="text-xs text-fg-subtle">
                  {p.finishRank
                    ? `${fmtTime(p.finishTimeSeconds)} · ${p.mistakes} mistakes`
                    : `${p.progress}/81 · DNF`}
                </p>
              </div>
            </div>
            {i === 0 && p.finishRank === 1 && <Trophy size={20} className="text-accent" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        <Button variant="primary" onClick={() => { useRaceStore.getState().reset(); go('race'); }}>
          New race
        </Button>
        <Button variant="secondary" onClick={() => { useRaceStore.getState().reset(); go('home'); }}>
          ← Home
        </Button>
      </div>
    </div>
  );
}
