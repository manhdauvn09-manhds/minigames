import { useEffect } from 'react';
import { useGameStore, useSettingsStore } from '../../store';
import { useEngine } from '../../hooks/useEngine';
import { useNavigation } from '../../hooks/useNavigation';
import { useTimerTick } from '../../hooks/useTimerTick';
import { useKeyboard } from '../../hooks/useKeyboard';
import { Board } from '../board/Board';
import { BoardOverlay } from '../board/BoardOverlay';
import { ControlBar } from '../controls/ControlBar';
import { NumberPad } from '../controls/NumberPad';
import { WinModal } from '../modals/WinModal';
import { LostModal } from '../modals/LostModal';
import { RaceOpponentBar } from '../race/RaceOpponentBar';
import { DIFFICULTY_CONFIG } from '../../core/constants';

export function GameScreen() {
  const engine = useEngine();
  const { go } = useNavigation();
  const puzzle = useGameStore((s) => s.puzzle);
  const status = useGameStore((s) => s.status);
  const mistakes = useGameStore((s) => s.mistakes);
  const limit = useSettingsStore((s) => s.mistakeLimit);

  // No puzzle = nothing to play. Bounce home (covers refresh-into-game).
  useEffect(() => {
    if (!puzzle) go('home');
  }, [puzzle, go]);

  // Mistake limit enforcement — settings is ground truth.
  useEffect(() => {
    if (limit > 0 && mistakes >= limit && status === 'playing') {
      useGameStore.setState({ status: 'lost', isTimerRunning: false });
    }
  }, [mistakes, limit, status]);

  useTimerTick();
  useKeyboard({
    onHint: () => {
      const board = useGameStore.getState().board;
      const lvl = puzzle?.difficulty ?? 5;
      void engine.hint(board, lvl).then((h) => {
        if (h) {
          useGameStore.getState().setHint(h);
          useGameStore.getState().applyHint();
        }
      });
    },
  });

  if (!puzzle) return null;

  const cfg = DIFFICULTY_CONFIG[puzzle.difficulty];

  return (
    <div className="min-h-screen flex flex-col items-center bg-bg text-fg gap-2 py-2">
      <ControlBar />
      <RaceOpponentBar />
      <p className="text-fg-subtle text-xs uppercase tracking-wide">
        {cfg.name} · seed: {puzzle.seed.slice(0, 16)}
      </p>
      <div className="relative w-full flex justify-center px-2">
        <Board />
        <div className="absolute inset-0 pointer-events-none flex justify-center">
          <div className="relative w-full max-w-[min(96vw,560px)] aspect-square">
            <BoardOverlay />
          </div>
        </div>
      </div>
      <div className="w-full flex justify-center px-2 pt-2">
        <NumberPad
          onHint={() => {
            const board = useGameStore.getState().board;
            void engine.hint(board, puzzle.difficulty).then((h) => {
              if (h) {
                useGameStore.getState().setHint(h);
                useGameStore.getState().applyHint();
              }
            });
          }}
        />
      </div>

      <WinModal />
      <LostModal />
    </div>
  );
}
