"use client";

import { cn } from "@/lib/utils/cn";
import type { CellType } from "@/lib/puzzle";

interface Props {
  type: CellType;
  /** Player's current path passes through this cell. */
  onPath: boolean;
  /** Hint highlight (Tier 1/2/3 result). */
  highlighted: boolean;
  /** Callback when cell is tapped/clicked. */
  onTap: () => void;
  /** Callback when pointer enters with button held (drag). */
  onDragOver: () => void;
  /** Cell size in px (computed by parent). */
  sizePx: number;
  ariaLabel: string;
}

export function BoardCell({
  type,
  onPath,
  highlighted,
  onTap,
  onDragOver,
  sizePx,
  ariaLabel,
}: Props) {
  const baseStyle: React.CSSProperties = { width: sizePx, height: sizePx };

  // Layered look: bg square, then optional path overlay, then symbol.
  let bg = "bg-cell-empty";
  if (type === "void") bg = "bg-cell-void";
  if (type === "lantern") bg = "bg-bg-elevated";

  let symbol: React.ReactNode = null;
  if (type === "lantern") {
    symbol = <span className="text-2xl text-accent">◉</span>;
  } else if (type === "bright") {
    symbol = (
      <span className={cn("text-xl", onPath ? "text-bg-primary" : "text-cell-bright")}>◆</span>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        onTap();
      }}
      onPointerEnter={(e) => {
        if (e.buttons === 1) onDragOver();
      }}
      aria-label={ariaLabel}
      className={cn(
        "relative flex items-center justify-center rounded-sm border transition-colors",
        bg,
        type === "void"
          ? "border-cell-void cursor-not-allowed"
          : "border-border-subtle hover:border-border-strong",
        onPath && type !== "lantern" && "ring-2 ring-accent ring-inset bg-accent-deep/50",
        highlighted && "ring-2 ring-cell-hint ring-inset shadow-glow-hint",
      )}
      style={baseStyle}
      disabled={type === "void"}
    >
      {symbol}
    </button>
  );
}
