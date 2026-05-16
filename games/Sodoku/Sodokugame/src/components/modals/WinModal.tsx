import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store';
import { useDailyStore, todayKey } from '../../store/dailyStore';
import { useAchievementsStore } from '../../store/achievementsStore';
import { useNavigation } from '../../hooks/useNavigation';
import { useStrings } from '../../hooks/useStrings';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DIFFICULTY_CONFIG } from '../../core/constants';
import { audio } from '../../lib/audio';
import { checkUnlocks } from '../../core/achievements';

function fmtTime(s: number): string {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function WinModal() {
  const t = useStrings();
  const { go } = useNavigation();
  const status = useGameStore((s) => s.status);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const mistakes = useGameStore((s) => s.mistakes);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const puzzle = useGameStore((s) => s.puzzle);
  const mode = useGameStore((s) => s.mode);
  // Track which puzzle.seed we've already credited so a Win modal
  // re-render doesn't double-count daily history or fire achievements
  // multiple times. Reset when status leaves 'won'.
  const creditedSeed = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'won' || !puzzle) {
      if (status !== 'won') creditedSeed.current = null;
      return;
    }
    if (creditedSeed.current === puzzle.seed) return;
    creditedSeed.current = puzzle.seed;

    audio.play('win');

    // Daily mode → record finish + recompute streak.
    let dailyStreak = 0;
    if (mode === 'daily') {
      useDailyStore.getState().recordFinish({
        date: todayKey(),
        timeSeconds: elapsed,
        mistakes,
        hintsUsed,
        finishedAt: new Date().toISOString(),
      });
      dailyStreak = useDailyStore.getState().currentStreak;
    }

    // Check achievements against current outcome.
    const alreadyUnlocked = new Set(useAchievementsStore.getState().unlocked);
    const newOnes = checkUnlocks({
      difficulty: puzzle.difficulty,
      timeSeconds: elapsed,
      mistakes,
      hintsUsed,
      isDaily: mode === 'daily',
      dailyStreak,
    }, alreadyUnlocked);
    useAchievementsStore.getState().unlockMany(newOnes);
  }, [status, puzzle, mode, elapsed, mistakes, hintsUsed]);

  return (
    <Modal open={status === 'won'} dismissable={false} ariaLabel={t.game.won}>
      <div className="text-center space-y-4">
        <h2 className="font-serif text-3xl text-win">{t.game.won}</h2>
        {puzzle && (
          <p className="text-fg-muted text-sm">
            {t.difficulty.label}: {t.difficulty[puzzle.difficulty]}
            {' · '}{DIFFICULTY_CONFIG[puzzle.difficulty].name}
          </p>
        )}
        <div className="grid grid-cols-3 gap-3 py-4 border-y border-border">
          <Stat label={t.game.timer} value={fmtTime(elapsed)} />
          <Stat label={t.game.mistakes} value={String(mistakes)} />
          <Stat label={t.game.hintsUsed} value={String(hintsUsed)} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button variant="primary" onClick={() => go('home')}>{t.game.newGame}</Button>
          <Button variant="secondary" onClick={() => go('stats')}>{t.game.leaderboard}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xl tabular-nums">{value}</div>
      <div className="text-xs text-fg-subtle uppercase tracking-wide">{label}</div>
    </div>
  );
}
