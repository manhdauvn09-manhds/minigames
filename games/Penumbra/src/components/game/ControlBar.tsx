"use client";

import { useGameStore } from "@/stores/gameStore";
import { Button } from "@/components/ui/Button";

export function ControlBar() {
  const retract = useGameStore((s) => s.retract);
  const reset = useGameStore((s) => s.reset);
  const path = useGameStore((s) => s.path);

  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" onClick={retract} disabled={path.length === 0}>
        ↶ Undo
      </Button>
      <Button variant="ghost" onClick={reset} disabled={path.length === 0}>
        ⟲ Reset
      </Button>
    </div>
  );
}
