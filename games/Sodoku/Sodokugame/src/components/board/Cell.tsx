import { memo } from 'react';
import { useGameStore, useSettingsStore } from '../../store';
import { BOARD_SIZE, BOX_SIZE } from '../../core/constants';
import { cn } from '../../utils/cn';
import { audio } from '../../lib/audio';

interface Props { row: number; col: number }

export const Cell = memo(function Cell({ row, col }: Props) {
  const value = useGameStore((s) => s.board[row][col]);
  const noteSet = useGameStore((s) => s.notes[row][col]);
  const isGiven = useGameStore((s) => !!s.givens[row * BOARD_SIZE + col]);
  const selected = useGameStore((s) => s.selectedCell);
  const solution = useGameStore((s) => s.puzzle?.solution);
  const showMistakes = useSettingsStore((s) => s.showMistakes);
  const hlPeers = useSettingsStore((s) => s.highlightPeers);
  const hlSame = useSettingsStore((s) => s.highlightSameValue);

  const isSelected = selected?.row === row && selected?.col === col;
  const isPeer = hlPeers && selected != null && (
    selected.row === row || selected.col === col ||
    (Math.trunc(selected.row / BOX_SIZE) === Math.trunc(row / BOX_SIZE) &&
     Math.trunc(selected.col / BOX_SIZE) === Math.trunc(col / BOX_SIZE))
  );
  const selectedValue = useGameStore((s) =>
    s.selectedCell ? s.board[s.selectedCell.row][s.selectedCell.col] : null,
  );
  const isSameValue = hlSame && value != null && selectedValue === value && !isSelected;
  const isMistake = showMistakes && !isGiven && value != null && solution != null
    && solution[row][col] !== value;

  // 3×3 box border emphasis on right + bottom of last col / row of each box
  // (CSS grid gap can't show different widths per edge, so we use cell borders).
  const borderRight = (col + 1) % BOX_SIZE === 0 && col !== BOARD_SIZE - 1;
  const borderBottom = (row + 1) % BOX_SIZE === 0 && row !== BOARD_SIZE - 1;

  return (
    <button
      type="button"
      onClick={() => {
        audio.play('click');
        useGameStore.getState().selectCell({ row, col });
      }}
      className={cn(
        'aspect-square w-full font-serif text-fg select-none flex items-center justify-center',
        'border border-border bg-bg transition-colors duration-fast',
        borderRight && 'border-r-2 border-r-fg-subtle',
        borderBottom && 'border-b-2 border-b-fg-subtle',
        isPeer && !isSelected && 'bg-bg-sunken',
        isSameValue && 'bg-accent-ghost',
        isSelected && 'bg-accent-ghost ring-2 ring-accent',
        isGiven ? 'font-bold text-fg' : 'text-accent',
        isMistake && 'text-loss',
        'cursor-pointer',
      )}
      aria-label={`Cell row ${row + 1} column ${col + 1}${value != null ? `, value ${value}` : ''}`}
    >
      {value != null ? (
        <span className="text-xl sm:text-2xl">{value}</span>
      ) : noteSet.size > 0 ? (
        <NoteGrid noteSet={noteSet} />
      ) : null}
    </button>
  );
});

function NoteGrid({ noteSet }: { noteSet: Set<number> }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-0 w-full h-full p-0.5">
      {Array.from({ length: 9 }, (_, i) => {
        const d = i + 1;
        return (
          <span
            key={d}
            className="text-[9px] sm:text-[11px] text-fg-subtle leading-none flex items-center justify-center"
          >
            {noteSet.has(d) ? d : ''}
          </span>
        );
      })}
    </div>
  );
}
