import { cellAt, idx, inBounds, isAdjacent, samePos } from "./board";
import type { Board, Path, ValidationResult } from "./types";

/**
 * Check whether `path` is a valid (possibly partial) draw on `board`.
 *
 * Valid means all rules are satisfied so far:
 *  - first cell is a lantern
 *  - every step is orthogonal-adjacent
 *  - no cell visited twice
 *  - never enters a "void" cell
 *  - all path cells are in bounds
 *
 * Complete (only meaningful when valid) means:
 *  - path ends on the OTHER lantern
 *  - every "bright" cell on the board appears in the path
 */
export function validatePath(board: Board, path: Path): ValidationResult {
  if (path.length === 0) {
    return { valid: false, reason: "empty path" };
  }

  const start = path[0]!;
  if (!inBounds(board, start)) {
    return { valid: false, reason: "start out of bounds" };
  }

  const lA = board.lanterns[0];
  const lB = board.lanterns[1];
  const startsAtLantern = samePos(start, lA) || samePos(start, lB);
  if (!startsAtLantern) {
    return { valid: false, reason: "must start at a lantern" };
  }

  const seen = new Set<number>();
  let brightsCovered = 0;

  for (let i = 0; i < path.length; i++) {
    const p = path[i]!;
    if (!inBounds(board, p)) {
      return { valid: false, reason: `out of bounds at index ${i}` };
    }
    const k = idx(board.cols, p);
    if (seen.has(k)) {
      return { valid: false, reason: `revisit at index ${i}` };
    }
    seen.add(k);

    const c = cellAt(board, p);
    if (c.type === "void") {
      return { valid: false, reason: `enters void at index ${i}` };
    }
    if (c.type === "bright") brightsCovered++;

    if (i > 0 && !isAdjacent(path[i - 1]!, p)) {
      return { valid: false, reason: `non-adjacent move at index ${i}` };
    }
  }

  const end = path[path.length - 1]!;
  const endsAtOtherLantern =
    (samePos(end, lA) && samePos(start, lB)) ||
    (samePos(end, lB) && samePos(start, lA));
  const allBright = brightsCovered === board.brightCount;

  return {
    valid: true,
    complete: endsAtOtherLantern && allBright,
    brightsCovered,
    brightsTotal: board.brightCount,
  };
}

/**
 * Sub-check used by hint Tier 1: a cell is "must visit" if removing it from
 * the candidate set makes a complete path impossible. For v1 this is
 * approximated by "is bright OR is a lantern".
 */
export function mustVisit(board: Board, p: import("./types").Position): boolean {
  const c = cellAt(board, p);
  return c.type === "bright" || c.type === "lantern";
}
