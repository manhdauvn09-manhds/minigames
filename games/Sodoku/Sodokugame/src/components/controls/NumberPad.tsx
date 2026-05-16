import { useGameStore } from '../../store';
import { useStrings } from '../../hooks/useStrings';
import { cn } from '../../utils/cn';
import { BIT, popcount } from '../../core/bitmask';
import { regionMasksFromBoard, candidatesFor } from '../../core/bitmask';
import { Eraser, Pencil, Sparkles } from 'lucide-react';
import { audio } from '../../lib/audio';

/** Counts how many of digit `d` are already placed on the board.
 * The number-pad dims a digit once all 9 instances are placed. */
function placedCounts(board: ReturnType<typeof useGameStore.getState>['board']): Uint8Array {
  const counts = new Uint8Array(10);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v != null) counts[v]++;
    }
  }
  return counts;
}

export function NumberPad({ onHint }: { onHint?: () => void }) {
  const t = useStrings();
  const pencilMode = useGameStore((s) => s.pencilMode);
  const selected = useGameStore((s) => s.selectedCell);
  const board = useGameStore((s) => s.board);

  const counts = placedCounts(board);

  // For the selected empty cell, compute candidate digits — non-candidates
  // are dimmed in the pad as a subtle hint.
  let validMask = 0;
  if (selected && board[selected.row][selected.col] == null) {
    const masks = regionMasksFromBoard(board);
    validMask = candidatesFor(masks, selected.row, selected.col);
  }
  void popcount;

  return (
    <div className="space-y-2 w-full max-w-[min(96vw,560px)]">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => useGameStore.getState().togglePencilMode()}
          className={cn(
            'flex items-center gap-1 px-3 py-2 rounded-md border border-border transition-colors duration-fast',
            pencilMode ? 'bg-accent text-white border-accent' : 'bg-bg-elevated text-fg hover:bg-bg-sunken',
          )}
          aria-pressed={pencilMode}
        >
          <Pencil size={16} />
          <span className="text-sm">{t.game.notes}</span>
        </button>
        <button
          type="button"
          onClick={() => selected && useGameStore.getState().fillAutoNotes(selected)}
          disabled={!selected}
          className="flex items-center gap-1 px-3 py-2 rounded-md border border-border bg-bg-elevated text-fg hover:bg-bg-sunken disabled:opacity-40 transition-colors duration-fast"
        >
          <Sparkles size={16} />
          <span className="text-sm">Auto</span>
        </button>
        <button
          type="button"
          onClick={() => useGameStore.getState().erase()}
          className="flex items-center gap-1 px-3 py-2 rounded-md border border-border bg-bg-elevated text-fg hover:bg-bg-sunken transition-colors duration-fast"
        >
          <Eraser size={16} />
          <span className="text-sm">{t.game.erase}</span>
        </button>
        {onHint && (
          <button
            type="button"
            onClick={onHint}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors duration-fast"
          >
            <span className="text-sm">{t.game.hint}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-9 gap-1">
        {Array.from({ length: 9 }, (_, i) => {
          const d = i + 1;
          const placed = counts[d];
          const exhausted = placed === 9;
          const isCandidate = !selected || (validMask & BIT[d]) !== 0
            || board[selected.row][selected.col] != null;
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                const s = useGameStore.getState();
                audio.play(s.pencilMode ? 'note' : 'place');
                s.placeValue(d);
              }}
              disabled={exhausted}
              className={cn(
                'aspect-square rounded-md font-serif text-xl sm:text-2xl',
                'bg-bg-elevated border border-border transition-all duration-fast',
                exhausted && 'opacity-30',
                !isCandidate && 'opacity-50',
                'hover:bg-accent-ghost active:bg-accent-press active:text-white',
              )}
              aria-label={`Place ${d}`}
            >
              {d}
              <span className="sr-only">({placed}/9 placed)</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
