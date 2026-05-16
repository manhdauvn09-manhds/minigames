"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useProgressStore } from "@/stores/progressStore";
import { Button } from "@/components/ui/Button";
import { Stars } from "@/components/ui/Stars";

interface Props {
  /** Stable id for this puzzle session (level id or daily date). */
  puzzleId: string;
  onNext?: () => void;
  nextLabel?: string;
  homeHref?: string;
}

export function ResultOverlay({ puzzleId, onNext, nextLabel = "Next →", homeHref = "/" }: Props) {
  const solved = useGameStore((s) => s.solved);
  const stars = useGameStore((s) => s.computeStars());
  const durationMs = useGameStore((s) => s.durationMs);
  const serializeShareGrid = useGameStore((s) => s.serializeShareGrid);
  const setBest = useProgressStore((s) => s.setBestStars);
  const [shareState, setShareState] = useState<"idle" | "copying" | "copied">("idle");

  useEffect(() => {
    if (solved && stars > 0) setBest(puzzleId, stars);
  }, [solved, stars, puzzleId, setBest]);

  if (!solved) return null;

  const sec = Math.floor(durationMs / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  async function onShare() {
    const text = serializeShareGrid();
    setShareState("copying");
    try {
      if (navigator.share) {
        await navigator.share({ text, title: "Penumbra" });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg-primary/80 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-xl bg-bg-elevated p-6 sm:rounded-xl border border-border-subtle shadow-lg">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-fg-muted">Solved</p>
          <Stars count={stars as 0 | 1 | 2 | 3} size="lg" />
          <p className="font-display text-2xl text-fg-primary">
            {stars === 3 ? "Optimal trace." : stars === 2 ? "Quiet solve." : "Found the light."}
          </p>
          <p className="font-mono text-sm text-fg-muted tabular-nums">
            {m}:{String(s).padStart(2, "0")}
          </p>

          <div className="flex flex-col gap-2 w-full pt-2 sm:flex-row sm:justify-center">
            <Button variant="primary" onClick={onShare}>
              {shareState === "copied" ? "✓ Copied" : shareState === "copying" ? "…" : "Share"}
            </Button>
            {onNext && (
              <Button variant="secondary" onClick={onNext}>
                {nextLabel}
              </Button>
            )}
            <a
              href={homeHref}
              className="inline-flex items-center justify-center gap-2 rounded-md font-body text-sm transition-colors duration-200 ease-soft text-fg-secondary hover:text-fg-primary hover:bg-surface-soft px-3 py-2"
            >
              ← Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
