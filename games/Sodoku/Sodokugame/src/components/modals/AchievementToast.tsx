import { useEffect, useState } from 'react';
import { useAchievementsStore } from '../../store/achievementsStore';
import { useSettingsStore } from '../../store';
import { audio } from '../../lib/audio';
import type { AchievementDef } from '../../core/achievements';

const TOAST_MS = 4000;

/** Pops up a corner toast for each newly-unlocked achievement, one at
 * a time. Auto-dismisses after TOAST_MS, then pulls the next from the
 * store's queue. */
export function AchievementToast() {
  const lang = useSettingsStore((s) => s.lang);
  const queueLen = useAchievementsStore((s) => s.toastQueue.length);
  const [current, setCurrent] = useState<AchievementDef | null>(null);

  useEffect(() => {
    if (current || queueLen === 0) return;
    const next = useAchievementsStore.getState().shiftToast();
    if (!next) return;
    setCurrent(next);
    audio.play('achieve');
    const id = window.setTimeout(() => setCurrent(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [current, queueLen]);

  if (!current) return null;
  const name = lang === 'vi' ? current.nameVi : current.nameEn;
  const desc = lang === 'vi' ? current.descVi : current.descEn;

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        fixed top-4 right-4 z-[60]
        max-w-xs bg-bg-elevated border border-accent rounded-lg shadow-3 p-3
        flex items-start gap-3
        animate-[fadeIn_0.3s_ease-out]
      "
      style={{ animation: 'achToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <span className="text-3xl flex-shrink-0">{current.icon}</span>
      <div className="min-w-0">
        <p className="text-fg-subtle text-xs uppercase tracking-wide">Achievement</p>
        <p className="font-medium text-fg">{name}</p>
        <p className="text-fg-muted text-sm">{desc}</p>
      </div>
      <style>{`
        @keyframes achToast {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
