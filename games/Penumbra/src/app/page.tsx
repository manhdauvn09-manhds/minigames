import Link from "next/link";

const TODAY_DIFF_BY_DOW: Record<number, number> = {
  0: 6, // Sun
  1: 3, // Mon
  2: 4,
  3: 6,
  4: 5,
  5: 7,
  6: 8,
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomePage() {
  const date = todayUTC();
  const dow = new Date().getUTCDay();
  const diff = TODAY_DIFF_BY_DOW[dow] ?? 5;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 py-10">
      <div className="flex w-full max-w-3xl flex-col items-center gap-10 text-center">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-display text-6xl text-fg-primary md:text-7xl">Penumbra</h1>
          <p className="font-body text-lg text-fg-secondary md:text-xl">
            Trace the line. Find the light.
          </p>
        </header>

        <section className="grid w-full gap-4 sm:grid-cols-2">
          <Link
            href="/daily"
            className="group flex flex-col items-start gap-2 rounded-lg border border-accent bg-bg-elevated p-5 text-left transition-colors hover:bg-surface-soft"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-accent">
              Daily · {date}
            </span>
            <span className="font-display text-2xl text-fg-primary">Begin today</span>
            <span className="text-sm text-fg-secondary">
              Difficulty {diff}/10 · same puzzle for everyone today
            </span>
          </Link>

          <Link
            href="/levels"
            className="group flex flex-col items-start gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-5 text-left transition-colors hover:border-border-strong hover:bg-surface-soft"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-fg-muted">
              Free play
            </span>
            <span className="font-display text-2xl text-fg-primary">Levels 1–60</span>
            <span className="text-sm text-fg-secondary">
              Path-drawing puzzles, 4×4 → 9×9, mechanics ramp up
            </span>
          </Link>
        </section>

        <section className="grid w-full gap-3 text-left text-sm text-fg-secondary sm:grid-cols-3">
          <div className="rounded-md bg-bg-elevated/50 p-3">
            <p className="font-display text-base text-fg-primary">1. Connect lanterns</p>
            <p>Draw a continuous orthogonal line from one lantern ◉ to the other.</p>
          </div>
          <div className="rounded-md bg-bg-elevated/50 p-3">
            <p className="font-display text-base text-fg-primary">2. Cover all bright cells ◆</p>
            <p>Your path must pass through every bright cell.</p>
          </div>
          <div className="rounded-md bg-bg-elevated/50 p-3">
            <p className="font-display text-base text-fg-primary">3. Avoid the void</p>
            <p>Dark cells are off-limits. No diagonals. No revisits.</p>
          </div>
        </section>

        <p className="font-mono text-xs text-fg-muted">
          v1 · path-drawing engine · localhost progress only · Skill #4 will add cloud save
        </p>
      </div>
    </main>
  );
}
