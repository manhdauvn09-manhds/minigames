import { useGameStore, useSettingsStore } from '../../store';
import { useStrings } from '../../hooks/useStrings';
import { useNavigation } from '../../hooks/useNavigation';
import { Pause, Play, RotateCcw, RotateCw, ChevronLeft, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ControlBar() {
  const t = useStrings();
  const { go } = useNavigation();
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const mistakes = useGameStore((s) => s.mistakes);
  const status = useGameStore((s) => s.status);
  const movesEmpty = useGameStore((s) => s.moves.length === 0);
  const redoEmpty = useGameStore((s) => s.redoStack.length === 0);
  const limit = useSettingsStore((s) => s.mistakeLimit);

  return (
    <div className="flex items-center gap-3 w-full max-w-[min(96vw,560px)] py-2 px-1">
      <Button variant="ghost" size="sm" onClick={() => go('home')} aria-label="Back">
        <ChevronLeft size={18} />
      </Button>

      <div className="flex-1 flex items-center justify-center gap-4">
        <span className="font-mono text-lg tabular-nums">{fmtTime(elapsed)}</span>
        <span className="flex items-center gap-1 text-sm text-fg-muted">
          <AlertCircle size={14} />
          {t.game.mistakes}: <span className="font-medium">{mistakes}{limit > 0 ? `/${limit}` : ''}</span>
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={() => useGameStore.getState().undo()}
              disabled={movesEmpty} aria-label={t.game.undo}>
        <RotateCcw size={18} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => useGameStore.getState().redo()}
              disabled={redoEmpty} aria-label={t.game.redo}>
        <RotateCw size={18} />
      </Button>
      <Button
        variant="ghost" size="sm"
        onClick={() => {
          if (status === 'paused') useGameStore.getState().resume();
          else useGameStore.getState().pause();
        }}
        aria-label={status === 'paused' ? t.game.resume : t.game.pause}
      >
        {status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
      </Button>
    </div>
  );
}
