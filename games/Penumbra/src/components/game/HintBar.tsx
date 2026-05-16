"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useProgressStore } from "@/stores/progressStore";
import { Button } from "@/components/ui/Button";

export function HintBar() {
  const applyHintTier1 = useGameStore((s) => s.applyHintTier1);
  const applyHintTier2 = useGameStore((s) => s.applyHintTier2);
  const applyHintTier3 = useGameStore((s) => s.applyHintTier3);
  const aiHintMessage = useGameStore((s) => s.aiHintMessage);
  const balance = useProgressStore((s) => s.hintBalance);
  const spendHint = useProgressStore((s) => s.spendHint);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function handleTier1() {
    setErrMsg(null);
    applyHintTier1();
  }
  function handleTier2() {
    if (!spendHint(1)) {
      setErrMsg("Không đủ hint (cần 1)");
      return;
    }
    setErrMsg(null);
    applyHintTier2();
  }
  function handleTier3() {
    if (!spendHint(2)) {
      setErrMsg("Không đủ hint (cần 2)");
      return;
    }
    setErrMsg(null);
    applyHintTier3();
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="ghost" onClick={handleTier1}>
          💡 Highlight (free)
        </Button>
        <Button variant="ghost" onClick={handleTier2} disabled={balance < 1}>
          ➡️ Next move (1)
        </Button>
        <Button variant="ghost" onClick={handleTier3} disabled={balance < 2}>
          🤖 AI explain (2)
        </Button>
        <span className="text-xs font-mono text-fg-muted">balance: {balance}</span>
      </div>
      {errMsg && <p className="text-xs text-danger">{errMsg}</p>}
      {aiHintMessage && (
        <div className="rounded-md border border-cell-hint bg-bg-elevated px-3 py-2 text-sm text-fg-secondary max-w-md text-center">
          {aiHintMessage}
        </div>
      )}
    </div>
  );
}
