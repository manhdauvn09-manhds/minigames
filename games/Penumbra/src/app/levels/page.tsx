"use client";

import Link from "next/link";
import { useProgressStore } from "@/stores/progressStore";
import { Stars } from "@/components/ui/Stars";

const LEVEL_COUNT = 60;

function difficultyOf(level: number): number {
  // 60 levels mapped to difficulty 1..10 in 6-level chunks.
  return Math.max(1, Math.min(10, Math.ceil(level / 6)));
}

export default function LevelsMap() {
  const bestStars = useProgressStore((s) => s.bestStars);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-sm text-fg-muted hover:text-fg-primary">
            ← Home
          </Link>
          <h1 className="font-display text-3xl text-fg-primary">Levels</h1>
          <span className="text-xs font-mono text-fg-muted">
            {Object.keys(bestStars).filter((k) => k.startsWith("L-")).length}/{LEVEL_COUNT}
          </span>
        </header>

        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
          {Array.from({ length: LEVEL_COUNT }, (_, i) => {
            const n = i + 1;
            const d = difficultyOf(n);
            const stars = (bestStars[`L-${n}`] ?? 0) as 0 | 1 | 2 | 3;
            return (
              <Link
                key={n}
                href={`/levels/${n}`}
                className="flex flex-col items-center gap-1 rounded-md border border-border-subtle bg-bg-elevated p-2 transition-colors hover:border-accent hover:bg-surface-soft"
              >
                <span className="font-display text-lg text-fg-primary">{n}</span>
                <span className="text-[10px] font-mono text-fg-muted">d{d}</span>
                <Stars count={stars} />
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
