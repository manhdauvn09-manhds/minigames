"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { samePos } from "@/lib/puzzle";
import { BoardCell } from "./BoardCell";

const MAX_BOARD_PX = 480;
const MIN_BOARD_PX = 280;

export function PuzzleBoard() {
  const puzzle = useGameStore((s) => s.puzzle);
  const path = useGameStore((s) => s.path);
  const highlighted = useGameStore((s) => s.highlightedCell);
  const tryExtend = useGameStore((s) => s.tryExtend);

  const [viewW, setViewW] = useState<number>(360);
  useEffect(() => {
    function onResize() {
      const w = Math.min(window.innerWidth - 32, MAX_BOARD_PX);
      setViewW(Math.max(MIN_BOARD_PX, w));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPathSet = useMemo(() => {
    const s = new Set<number>();
    if (puzzle) for (const p of path) s.add(p.row * puzzle.board.cols + p.col);
    return s;
  }, [path, puzzle]);

  if (!puzzle) return null;
  const { rows, cols } = puzzle.board;
  const cellPx = Math.floor((viewW - (cols + 1) * 4) / cols);

  return (
    <div
      className="grid gap-1 p-1 bg-surface-soft rounded-lg shadow-md select-none touch-none"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
        width: cellPx * cols + (cols + 1) * 4,
      }}
    >
      {Array.from({ length: rows * cols }, (_, k) => {
        const row = Math.floor(k / cols);
        const col = k % cols;
        const cell = puzzle.board.cells[k]!;
        const isHighlighted = !!highlighted && samePos(highlighted, { row, col });
        return (
          <BoardCell
            key={k}
            type={cell.type}
            onPath={onPathSet.has(k)}
            highlighted={isHighlighted}
            sizePx={cellPx}
            ariaLabel={`Cell row ${row + 1} column ${col + 1}: ${cell.type}`}
            onTap={() => tryExtend({ row, col })}
            onDragOver={() => tryExtend({ row, col })}
          />
        );
      })}
    </div>
  );
}
