"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";

export function Timer() {
  const startedAt = useGameStore((s) => s.startedAt);
  const solved = useGameStore((s) => s.solved);
  const durationMs = useGameStore((s) => s.durationMs);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (solved) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [solved]);

  const ms = solved ? durationMs : startedAt > 0 ? now - startedAt : 0;
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  return (
    <span className="font-mono text-sm text-fg-muted tabular-nums">
      ⏱ {m}:{String(s).padStart(2, "0")}
    </span>
  );
}
