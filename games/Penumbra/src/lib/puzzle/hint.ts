import { cellAt, idx, neighbors, samePos } from "./board";
import type { Board, Path, Position } from "./types";

/**
 * Hint Tier 1 — "highlight": cost 0, allows up to 3 stars.
 * Highlights one bright cell that the current path does not yet cover.
 * Returns null if all brights already covered or no brights exist.
 */
export function hintTier1(board: Board, path: Path): Position | null {
  const onPath = new Set(path.map((p) => idx(board.cols, p)));
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      const p = { row: r, col: c };
      if (cellAt(board, p).type !== "bright") continue;
      if (!onPath.has(idx(board.cols, p))) return p;
    }
  }
  return null;
}

/**
 * Hint Tier 2 — "next-move": cost 1, caps at 1 star.
 * Suggests the next legal cell to extend the current path. Picks a neighbor
 * of the path tail that does NOT enter void and has not been visited.
 * Prefers neighbors that are bright or have at least 1 escape.
 *
 * Returns null if no legal extension exists or the path is already complete
 * (i.e. ends at the other lantern).
 */
export function hintTier2(board: Board, path: Path): Position | null {
  if (path.length === 0) return null;
  const tail = path[path.length - 1]!;
  // Already at other lantern → no extension.
  const lA = board.lanterns[0];
  const lB = board.lanterns[1];
  const start = path[0]!;
  if (
    (samePos(tail, lA) && samePos(start, lB)) ||
    (samePos(tail, lB) && samePos(start, lA))
  ) {
    return null;
  }
  const visited = new Set(path.map((p) => idx(board.cols, p)));
  const candidates = neighbors(board, tail)
    .filter((n) => !visited.has(idx(board.cols, n)))
    .filter((n) => cellAt(board, n).type !== "void");
  if (candidates.length === 0) return null;
  // Prefer bright candidates first.
  candidates.sort((a, b) => {
    const aBright = cellAt(board, a).type === "bright" ? 0 : 1;
    const bBright = cellAt(board, b).type === "bright" ? 0 : 1;
    if (aBright !== bBright) return aBright - bBright;
    return 0;
  });
  return candidates[0] ?? null;
}

export interface HintExplainPayload {
  tier: 1 | 2 | 3;
  highlight: Position | null;
  /** v1 returns a deterministic hint string. Skill #4 will swap this out for an SSE Anthropic call. */
  message: string;
}

/**
 * Hint Tier 3 — "ai-explain" (deterministic stand-in for v1 — Skill #4
 * will replace with an Anthropic SSE call per game-spec.json#ai.hintExplainer).
 */
export function hintTier3(board: Board, path: Path): HintExplainPayload {
  const next = hintTier2(board, path);
  const bright = hintTier1(board, path);
  if (!next && !bright) {
    return {
      tier: 3,
      highlight: null,
      message:
        "Path đã đi qua tất cả ô sáng. Hãy quay về ngọn đèn còn lại.",
    };
  }
  if (bright) {
    return {
      tier: 3,
      highlight: bright,
      message:
        "Còn ô sáng chưa qua. Vạch đường tránh các ô tối sao cho ghé qua nó trước khi tới ngọn đèn cuối.",
    };
  }
  return {
    tier: 3,
    highlight: next,
    message:
      "Hãy thử bước tiếp về ô được làm nổi. Nó giữ cho đường đi không bị bí khi đoạn cuối.",
  };
}
