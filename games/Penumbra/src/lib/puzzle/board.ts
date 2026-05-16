import type { Board, Cell, Position } from "./types";

export const idx = (cols: number, p: Position): number => p.row * cols + p.col;

export const inBounds = (b: { rows: number; cols: number }, p: Position): boolean =>
  p.row >= 0 && p.row < b.rows && p.col >= 0 && p.col < b.cols;

export function cellAt(b: Board, p: Position): Cell {
  const c = b.cells[idx(b.cols, p)];
  if (!c) throw new Error(`cellAt out of bounds: ${p.row},${p.col}`);
  return c;
}

export const isAdjacent = (a: Position, b: Position): boolean =>
  (Math.abs(a.row - b.row) === 1 && a.col === b.col) ||
  (Math.abs(a.col - b.col) === 1 && a.row === b.row);

export const samePos = (a: Position, b: Position): boolean =>
  a.row === b.row && a.col === b.col;

export function neighbors(b: { rows: number; cols: number }, p: Position): Position[] {
  const out: Position[] = [];
  if (p.row > 0) out.push({ row: p.row - 1, col: p.col });
  if (p.row < b.rows - 1) out.push({ row: p.row + 1, col: p.col });
  if (p.col > 0) out.push({ row: p.row, col: p.col - 1 });
  if (p.col < b.cols - 1) out.push({ row: p.row, col: p.col + 1 });
  return out;
}

/** Build an empty board (all cells type "empty"). Lanterns/brights set later. */
export function emptyBoard(rows: number, cols: number): Board {
  const cells: Cell[] = new Array(rows * cols);
  for (let i = 0; i < rows * cols; i++) cells[i] = { type: "empty" };
  return {
    rows,
    cols,
    cells,
    lanterns: [
      { row: 0, col: 0 },
      { row: 0, col: 0 },
    ],
    brightCount: 0,
  };
}
