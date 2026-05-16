import { describe, expect, it } from "vitest";
import {
  emptyBoard,
  generateDailyPuzzle,
  generatePuzzle,
  hintTier1,
  hintTier2,
  validatePath,
} from "../../src/lib/puzzle";
import type { Board, Path } from "../../src/lib/puzzle";

function setCell(b: Board, row: number, col: number, type: "lantern" | "bright" | "empty" | "void") {
  b.cells[row * b.cols + col] = { type };
}

function build3x3(): Board {
  const b = emptyBoard(3, 3);
  // L . L
  // . . .
  // . B .
  setCell(b, 0, 0, "lantern");
  setCell(b, 0, 2, "lantern");
  setCell(b, 2, 1, "bright");
  b.lanterns = [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
  ];
  b.brightCount = 1;
  return b;
}

describe("validatePath", () => {
  const b = build3x3();

  it("rejects empty path", () => {
    const r = validatePath(b, []);
    expect(r.valid).toBe(false);
  });

  it("rejects path not starting at a lantern", () => {
    const r = validatePath(b, [{ row: 1, col: 1 }]);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/lantern/);
  });

  it("rejects diagonal moves", () => {
    const path: Path = [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
    ];
    const r = validatePath(b, path);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/non-adjacent/);
  });

  it("rejects revisits", () => {
    const path: Path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 0 },
    ];
    const r = validatePath(b, path);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/revisit/);
  });

  it("rejects entering a void", () => {
    const b2 = build3x3();
    setCell(b2, 1, 0, "void");
    const path: Path = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ];
    const r = validatePath(b2, path);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/void/);
  });

  it("marks valid-but-incomplete when path ends mid-board", () => {
    const path: Path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ];
    const r = validatePath(b, path);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.complete).toBe(false);
  });

  it("marks complete when ending at other lantern AND covering all brights", () => {
    // L → (0,1) → (1,1) → (2,1)bright → (2,2) → (1,2) → (0,2)L
    const path: Path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 1, col: 2 },
      { row: 0, col: 2 },
    ];
    const r = validatePath(b, path);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.complete).toBe(true);
      expect(r.brightsCovered).toBe(1);
      expect(r.brightsTotal).toBe(1);
    }
  });

  it("marks valid-but-incomplete when ending at other lantern but missing a bright", () => {
    // Skip the (2,1) bright entirely.
    const path: Path = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];
    const r = validatePath(b, path);
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.complete).toBe(false);
      expect(r.brightsCovered).toBe(0);
    }
  });
});

describe("generatePuzzle", () => {
  it("is deterministic for a given (difficulty, seed) pair", () => {
    const a = generatePuzzle(5, 42);
    const b = generatePuzzle(5, 42);
    expect(a.board.rows).toBe(b.board.rows);
    expect(a.board.cells).toEqual(b.board.cells);
    expect(a.optimalPathLength).toBe(b.optimalPathLength);
  });

  it("scales board size with difficulty", () => {
    expect(generatePuzzle(1, 1).board.rows).toBe(4);
    expect(generatePuzzle(10, 1).board.rows).toBe(8); // 4 + min(5, 4) = 8 cap, see formula
  });

  it("places exactly 2 lanterns", () => {
    const p = generatePuzzle(5, 7);
    const lanternCells = p.board.cells.filter((c) => c.type === "lantern");
    expect(lanternCells).toHaveLength(2);
  });

  it("optimal path length is at least the bright count + 2 lanterns", () => {
    const p = generatePuzzle(6, 100);
    expect(p.optimalPathLength).toBeGreaterThanOrEqual(p.board.brightCount + 2);
  });

  it("daily puzzle is reproducible from date string", () => {
    const a = generateDailyPuzzle("2026-04-26");
    const b = generateDailyPuzzle("2026-04-26");
    expect(a.id).toBe(b.id);
    expect(a.board.cells).toEqual(b.board.cells);
  });
});

describe("hintTier1 (highlight)", () => {
  it("returns null when all brights are on the path", () => {
    const b = build3x3();
    const path: Path = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 }, // bright
    ];
    expect(hintTier1(b, path)).toBeNull();
  });

  it("returns an uncovered bright when one exists", () => {
    const b = build3x3();
    const h = hintTier1(b, [{ row: 0, col: 0 }]);
    expect(h).toEqual({ row: 2, col: 1 });
  });
});

describe("hintTier2 (next-move)", () => {
  it("returns null when path is empty", () => {
    expect(hintTier2(build3x3(), [])).toBeNull();
  });

  it("suggests an adjacent non-void unvisited cell", () => {
    const b = build3x3();
    setCell(b, 0, 1, "void"); // block right of lantern
    const h = hintTier2(b, [{ row: 0, col: 0 }]);
    // Only legal direction = down (1,0).
    expect(h).toEqual({ row: 1, col: 0 });
  });

  it("returns null when no legal extension exists (corner trap)", () => {
    const b = build3x3();
    setCell(b, 0, 1, "void");
    setCell(b, 1, 0, "void");
    const h = hintTier2(b, [{ row: 0, col: 0 }]);
    expect(h).toBeNull();
  });

  it("returns null when path already at the other lantern", () => {
    const b = build3x3();
    const h = hintTier2(b, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);
    expect(h).toBeNull();
  });
});
