import { useEffect } from 'react';
import { useGameStore } from '../store';

/** Drives the in-game timer. Mounted by GameScreen so the interval
 * stops when leaving the game. */
export function useTimerTick(): void {
  const isRunning = useGameStore((s) => s.isTimerRunning);
  const status = useGameStore((s) => s.status);

  useEffect(() => {
    if (!isRunning || status !== 'playing') return;
    const id = window.setInterval(() => useGameStore.getState().tickTimer(), 1000);
    return () => window.clearInterval(id);
  }, [isRunning, status]);
}
