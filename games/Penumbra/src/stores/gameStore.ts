import { create } from "zustand";
import {
  cellAt,
  hintTier1,
  hintTier2,
  hintTier3,
  isAdjacent,
  samePos,
  validatePath,
  type HintExplainPayload,
} from "@/lib/puzzle";
import type { Path, Position, Puzzle } from "@/lib/puzzle";

interface GameState {
  puzzle: Puzzle | null;
  path: Path;
  history: Path[];
  hintsUsed: { tier1: number; tier2: number; tier3: number };
  highlightedCell: Position | null;
  aiHintMessage: string | null;
  startedAt: number;
  durationMs: number;
  solved: boolean;

  loadPuzzle: (p: Puzzle) => void;
  /** Try to extend path with the given cell. Returns true if accepted. */
  tryExtend: (p: Position) => boolean;
  /** Pop the last cell off the path (undo single step). */
  retract: () => void;
  reset: () => void;
  /** Tier 1: highlight a missing bright (cost 0). */
  applyHintTier1: () => Position | null;
  /** Tier 2: suggest the next legal move (cost 1, caps at 1 star). */
  applyHintTier2: () => Position | null;
  /** Tier 3: deterministic explainer text (cost 2, caps at 1 star). */
  applyHintTier3: () => HintExplainPayload;
  /** Compute final star rating per game-spec.json#starsRubric. */
  computeStars: () => 0 | 1 | 2 | 3;
  /** Wordle-style emoji share grid. */
  serializeShareGrid: () => string;
}

export const useGameStore = create<GameState>((set, get) => ({
  puzzle: null,
  path: [],
  history: [],
  hintsUsed: { tier1: 0, tier2: 0, tier3: 0 },
  highlightedCell: null,
  aiHintMessage: null,
  startedAt: 0,
  durationMs: 0,
  solved: false,

  loadPuzzle(p) {
    set({
      puzzle: p,
      path: [],
      history: [],
      hintsUsed: { tier1: 0, tier2: 0, tier3: 0 },
      highlightedCell: null,
      aiHintMessage: null,
      startedAt: Date.now(),
      durationMs: 0,
      solved: false,
    });
  },

  tryExtend(p) {
    const { puzzle, path, solved } = get();
    if (!puzzle || solved) return false;

    // First cell: must be a lantern.
    if (path.length === 0) {
      const c = cellAt(puzzle.board, p);
      if (c.type !== "lantern") return false;
      const newPath = [p];
      const r = validatePath(puzzle.board, newPath);
      if (!r.valid) return false;
      set({ path: newPath, history: [...get().history, path] });
      return true;
    }

    // Tap on the path tail = retract single step.
    const tail = path[path.length - 1]!;
    if (samePos(tail, p)) {
      get().retract();
      return true;
    }

    // Tap on penultimate cell = retract.
    if (path.length >= 2 && samePos(path[path.length - 2]!, p)) {
      get().retract();
      return true;
    }

    // Tap on a cell already on path (not last/penultimate) → ignore.
    if (path.some((q) => samePos(q, p))) return false;

    // Otherwise try to extend.
    if (!isAdjacent(tail, p)) return false;

    const candidate = [...path, p];
    const r = validatePath(puzzle.board, candidate);
    if (!r.valid) return false;

    const newHistory = [...get().history, path];
    let nowSolved = false;
    let dur = 0;
    if (r.complete) {
      nowSolved = true;
      dur = Date.now() - get().startedAt;
    }
    set({
      path: candidate,
      history: newHistory,
      solved: nowSolved,
      durationMs: nowSolved ? dur : 0,
    });
    return true;
  },

  retract() {
    const { path, history } = get();
    if (path.length === 0) return;
    const prev = history[history.length - 1] ?? [];
    set({
      path: prev,
      history: history.slice(0, -1),
      solved: false,
      durationMs: 0,
    });
  },

  reset() {
    set({
      path: [],
      history: [],
      highlightedCell: null,
      aiHintMessage: null,
      solved: false,
      durationMs: 0,
      startedAt: Date.now(),
    });
  },

  applyHintTier1() {
    const { puzzle, path } = get();
    if (!puzzle) return null;
    const h = hintTier1(puzzle.board, path);
    set((s) => ({
      hintsUsed: { ...s.hintsUsed, tier1: s.hintsUsed.tier1 + 1 },
      highlightedCell: h,
    }));
    return h;
  },

  applyHintTier2() {
    const { puzzle, path } = get();
    if (!puzzle) return null;
    const h = hintTier2(puzzle.board, path);
    set((s) => ({
      hintsUsed: { ...s.hintsUsed, tier2: s.hintsUsed.tier2 + 1 },
      highlightedCell: h,
    }));
    return h;
  },

  applyHintTier3() {
    const { puzzle, path } = get();
    if (!puzzle) {
      return { tier: 3, highlight: null, message: "" };
    }
    const r = hintTier3(puzzle.board, path);
    set((s) => ({
      hintsUsed: { ...s.hintsUsed, tier3: s.hintsUsed.tier3 + 1 },
      highlightedCell: r.highlight,
      aiHintMessage: r.message,
    }));
    return r;
  },

  computeStars() {
    const { puzzle, path, hintsUsed, solved } = get();
    if (!puzzle || !solved) return 0;
    if (hintsUsed.tier2 > 0 || hintsUsed.tier3 > 0) return 1;
    if (path.length === puzzle.optimalPathLength) return 3;
    return 2;
  },

  serializeShareGrid() {
    const { puzzle, path, durationMs } = get();
    if (!puzzle) return "";
    const rows = puzzle.board.rows;
    const cols = puzzle.board.cols;
    const onPath = new Set<number>();
    for (const p of path) onPath.add(p.row * cols + p.col);
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const cell = puzzle.board.cells[r * cols + c]!;
        const onP = onPath.has(r * cols + c);
        if (cell.type === "lantern") line += "🟡";
        else if (cell.type === "void") line += "⬛";
        else if (cell.type === "bright" && onP) line += "🟧";
        else if (cell.type === "bright") line += "🟫";
        else if (onP) line += "🟨";
        else line += "⬜";
      }
      lines.push(line);
    }
    const stars = get().computeStars();
    const starStr = "★".repeat(stars) + "☆".repeat(3 - stars);
    const sec = Math.floor(durationMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const time = `${m}:${String(s).padStart(2, "0")}`;
    return [
      `Penumbra · level d${puzzle.difficulty}`,
      `${starStr} · ${time}`,
      "",
      ...lines,
      "",
      "https://penumbra.allin1site.com",
    ].join("\n");
  },
}));
