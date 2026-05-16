"use client";

import { useEffect } from "react";
import Link from "next/link";
import { generateDailyPuzzle } from "@/lib/puzzle";
import { useGameStore } from "@/stores/gameStore";
import { useProgressStore } from "@/stores/progressStore";
import { PuzzleBoard } from "@/components/game/PuzzleBoard";
import { Timer } from "@/components/game/Timer";
import { ControlBar } from "@/components/game/ControlBar";
import { HintBar } from "@/components/game/HintBar";
import { ResultOverlay } from "@/components/game/ResultOverlay";
import { HowToPlay } from "@/components/game/HowToPlay";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyPlay() {
  const date = todayUTC();
  const loadPuzzle = useGameStore((s) => s.loadPuzzle);
  const solved = useGameStore((s) => s.solved);
  const recordDailySolve = useProgressStore((s) => s.recordDailySolve);
  const streak = useProgressStore((s) => s.streak);

  useEffect(() => {
    const puzzle = generateDailyPuzzle(date);
    loadPuzzle(puzzle);
  }, [date, loadPuzzle]);

  useEffect(() => {
    if (solved) recordDailySolve(date);
  }, [solved, date, recordDailySolve]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-bg-primary px-4 py-6 gap-4">
      <header className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="text-sm text-fg-muted hover:text-fg-primary">
          ← Home
        </Link>
        <h1 className="font-display text-xl text-fg-primary">
          Daily · <span className="font-mono text-sm text-fg-muted">{date}</span>
        </h1>
        <span className="text-xs font-mono text-fg-muted">🔥 {streak}</span>
      </header>

      <PuzzleBoard />
      <ControlBar />
      <HintBar />
      <Timer />

      <HowToPlay />

      <ResultOverlay puzzleId={`D-${date}`} homeHref="/" />
    </main>
  );
}
