/**
 * Penumbra puzzle engine — public types.
 *
 * Path-drawing puzzle: continuous orthogonal chain between two lanterns,
 * passes through every bright cell, never enters a void cell, never crosses
 * itself. Spec: game-spec.json#puzzle.
 *
 * v1 supports cell types: lantern, bright, empty, void.
 * v2 (level ≥ 21) will add: portal, switch.
 */

export type CellType = "lantern" | "bright" | "empty" | "void";

export interface Cell {
  type: CellType;
}

export interface Position {
  row: number;
  col: number;
}

export interface Board {
  rows: number;
  cols: number;
  /** row-major, length = rows*cols */
  cells: Cell[];
  /** exactly 2 lantern positions (path endpoints) */
  lanterns: [Position, Position];
  /** count of bright cells (path must visit all) */
  brightCount: number;
}

export interface Puzzle {
  id: string;
  difficulty: number; // 1..10
  seed: number;
  board: Board;
  /** length of the canonical solution path (lantern → lantern, all brights). 3-star threshold. */
  optimalPathLength: number;
}

/** Ordered sequence of cells the player has drawn. */
export type Path = Position[];

export type ValidationResult =
  | {
      valid: true;
      complete: boolean;
      brightsCovered: number;
      brightsTotal: number;
    }
  | { valid: false; reason: string };

export const ALL_CELL_TYPES: readonly CellType[] = [
  "lantern",
  "bright",
  "empty",
  "void",
];
