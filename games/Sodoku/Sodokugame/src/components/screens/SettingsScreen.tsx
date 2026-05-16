import { useSettingsStore } from '../../store';
import { useNavigation } from '../../hooks/useNavigation';
import { useStrings } from '../../hooks/useStrings';
import { Button } from '../ui/Button';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { ThemePref, LangPref } from '../../store/settingsStore';

export function SettingsScreen() {
  const t = useStrings();
  const { go } = useNavigation();
  const s = useSettingsStore();

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg p-4 gap-6 max-w-md mx-auto w-full">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => go('home')}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="font-serif text-2xl">Settings</h1>
      </header>

      <Section label={t.theme.label}>
        <SegGroup
          options={[
            { value: 'light', label: t.theme.light },
            { value: 'auto',  label: t.theme.auto  },
            { value: 'dark',  label: t.theme.dark  },
          ]}
          value={s.theme}
          onChange={(v) => s.setTheme(v as ThemePref)}
        />
      </Section>

      <Section label="Language">
        <SegGroup
          options={[
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' },
            { value: 'ja', label: '日本語' },
          ]}
          value={s.lang}
          onChange={(v) => s.setLang(v as LangPref)}
        />
      </Section>

      <Section label="Audio">
        <Toggle label="Sound effects" checked={s.soundOn} onToggle={s.toggleSound} />
      </Section>

      <Section label="Gameplay">
        <Toggle label="Auto-fill notes" checked={s.autoNotes} onToggle={s.toggleAutoNotes} />
        <Toggle label="Highlight peers" checked={s.highlightPeers} onToggle={s.toggleHighlightPeers} />
        <Toggle label="Highlight same value" checked={s.highlightSameValue} onToggle={s.toggleHighlightSameValue} />
        <Toggle label="Show mistakes" checked={s.showMistakes} onToggle={s.toggleShowMistakes} />
        <div className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm">Mistake limit (0 = unlimited)</span>
          <input
            type="number" min={0} max={99} value={s.mistakeLimit}
            onChange={(e) => s.setMistakeLimit(Number(e.target.value))}
            className="w-16 px-2 py-1 rounded border border-border bg-bg-elevated text-fg text-right"
          />
        </div>
      </Section>

      <Button variant="ghost" onClick={() => s.reset()}>Reset to defaults</Button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-fg-subtle text-xs uppercase tracking-widest">{label}</h2>
      <div className="bg-bg-elevated rounded-md border border-border p-3 space-y-1">{children}</div>
    </section>
  );
}

function SegGroup<V extends string>({ options, value, onChange }: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div className="flex gap-1 bg-bg-sunken p-1 rounded-md">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 px-3 py-1.5 rounded text-sm transition-colors duration-fast',
            value === o.value ? 'bg-bg-elevated text-fg shadow-1' : 'text-fg-muted hover:text-fg',
          )}
          aria-pressed={value === o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onToggle }: {
  label: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors duration-fast',
          checked ? 'bg-accent' : 'bg-bg-sunken border border-border',
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-bg shadow-1 transition-transform duration-fast',
          checked && 'translate-x-4',
        )} />
      </button>
    </label>
  );
}
