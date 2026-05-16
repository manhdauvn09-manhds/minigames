"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generatePuzzle } from "@/lib/puzzle";
import { useGameStore } from "@/stores/gameStore";
import { PuzzleBoard } from "@/components/game/PuzzleBoard";
import { Timer } from "@/components/game/Timer";
import { ControlBar } from "@/components/game/ControlBar";
import { HintBar } from "@/components/game/HintBar";
import { ResultOverlay } from "@/components/game/ResultOverlay";
import { HowToPlay } from "@/components/game/HowToPlay";

const LEVEL_COUNT = 60;

function difficultyOf(level: number): number {
  return Math.max(1, Math.min(10, Math.ceil(level / 6)));
}

// Next.js 14 client-component dynamic route params: plain object, NOT
// Promise. (Promise form is Next 15+ — would need React.use() to unwrap.)
interface PageProps {
  params: { id: string };
}

export default function LevelPlay({ params }: PageProps) {
  const router = useRouter();
  const { id } = params;
  const levelNum = parseInt(id, 10);

  const loadPuzzle = useGameStore((s) => s.loadPuzzle);

  useEffect(() => {
    if (Number.isNaN(levelNum) || levelNum < 1 || levelNum > LEVEL_COUNT) return;
    const d = difficultyOf(levelNum);
    const puzzle = generatePuzzle(d, levelNum);
    loadPuzzle(puzzle);
  }, [levelNum, loadPuzzle]);

  if (Number.isNaN(levelNum) || levelNum < 1 || levelNum > LEVEL_COUNT) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-primary px-6 text-center">
        <p className="text-fg-secondary">Level {id} không tồn tại.</p>
      </main>
    );
  }

  const next = levelNum < LEVEL_COUNT ? levelNum + 1 : null;

  return (
    <main className="flex min-h-screen flex-col items-center bg-bg-primary px-4 py-6 gap-4">
      <header className="flex w-full max-w-md items-center justify-between">
        <Link href="/levels" className="text-sm text-fg-muted hover:text-fg-primary">
          ← Levels
        </Link>
        <h1 className="font-display text-xl text-fg-primary">
          Level {levelNum}
          <span className="text-sm font-mono text-fg-muted ml-2">d{difficultyOf(levelNum)}</span>
        </h1>
        <Timer />
      </header>

      <PuzzleBoard />
      <ControlBar />
      <HintBar />

      <HowToPlay />

      <ResultOverlay
        puzzleId={`L-${levelNum}`}
        onNext={next ? () => router.push(`/levels/${next}`) : undefined}
        nextLabel={next ? `Level ${next} →` : ""}
        homeHref="/levels"
      />
    </main>
  );
}
