import { useStrings } from '../../hooks/useStrings';
import { DIFFICULTY_CONFIG } from '../../core/constants';
import { cn } from '../../utils/cn';
import type { DifficultyLevel } from '../../core/types';

interface Props {
  onPick: (level: DifficultyLevel) => void;
  disabled?: boolean;
}

export function DifficultyPicker({ onPick, disabled }: Props) {
  const t = useStrings();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
      {([1, 2, 3, 4, 5] as const).map((lv) => {
        const cfg = DIFFICULTY_CONFIG[lv];
        return (
          <button
            key={lv}
            type="button"
            onClick={() => onPick(lv)}
            disabled={disabled}
            className={cn(
              'group flex items-center justify-between gap-3 p-4 rounded-lg',
              'bg-bg-elevated border border-border hover:border-accent transition-all duration-fast',
              'disabled:opacity-50 disabled:cursor-wait',
              'text-left',
            )}
          >
            <div>
              <div className="font-serif text-lg" style={{ color: cfg.color }}>
                {t.difficulty[lv]}
              </div>
              <div className="text-xs text-fg-subtle mt-0.5">
                {cfg.clueRange.min}-{cfg.clueRange.max} clues · {cfg.name}
              </div>
            </div>
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: cfg.color }}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
