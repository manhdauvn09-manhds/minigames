import { useNavigation } from '../../hooks/useNavigation';
import { useStrings } from '../../hooks/useStrings';
import { useSettingsStore } from '../../store';
import { useDailyStore } from '../../store/dailyStore';
import { useAchievementsStore } from '../../store/achievementsStore';
import { ACHIEVEMENTS } from '../../core/achievements';
import { Button } from '../ui/Button';
import { ChevronLeft, Flame, Trophy } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Local stats — Phase 7A will add server-synced leaderboards.
 * For now: streak summary + achievements gallery. */
export function StatsScreen() {
  const t = useStrings();
  const { go } = useNavigation();
  const lang = useSettingsStore((s) => s.lang);
  const currentStreak = useDailyStore((s) => s.currentStreak);
  const longestStreak = useDailyStore((s) => s.longestStreak);
  const dailyCount = useDailyStore((s) => Object.keys(s.history).length);
  const unlocked = useAchievementsStore((s) => s.unlocked);

  const isUnlocked = (id: string): boolean => unlocked.includes(id);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg p-4 gap-6 max-w-md mx-auto w-full">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => go('home')}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="font-serif text-2xl">{t.game.leaderboard}</h1>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Stat icon={<Flame size={18} />} label="Streak" value={currentStreak} />
        <Stat icon={<Flame size={18} />} label="Longest" value={longestStreak} />
        <Stat icon={<Trophy size={18} />} label="Daily wins" value={dailyCount} />
      </section>

      <section className="space-y-2">
        <h2 className="text-fg-subtle text-xs uppercase tracking-widest">
          Achievements ({unlocked.length}/{ACHIEVEMENTS.length})
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {ACHIEVEMENTS.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-md border border-border',
                isUnlocked(a.id) ? 'bg-bg-elevated' : 'bg-bg-sunken opacity-60',
              )}
            >
              <span className="text-2xl flex-shrink-0">{a.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-fg">
                  {lang === 'vi' ? a.nameVi : a.nameEn}
                </p>
                <p className="text-fg-muted text-sm">
                  {lang === 'vi' ? a.descVi : a.descEn}
                </p>
              </div>
              {isUnlocked(a.id) && (
                <span className="text-xs text-accent flex-shrink-0">✓</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <p className="text-fg-subtle text-xs text-center mt-auto pb-4">
        Server-side leaderboard ships in Phase 7A.
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-bg-elevated rounded-md p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-accent">
        {icon}
        <span className="text-2xl font-mono tabular-nums">{value}</span>
      </div>
      <p className="text-xs text-fg-subtle mt-1">{label}</p>
    </div>
  );
}
