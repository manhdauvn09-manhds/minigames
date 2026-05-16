// Shared types for all techniques. A technique reads a Board + the
// pre-computed candidate matrix (Uint16Array of length 81) and either
// finds a single applicable instance — returning a TechniqueResult — or
// returns null (this technique didn't fire on this position).
//
// The technique does NOT mutate the board. The solver caller decides
// whether to apply the placements / eliminations and recompute candidates.

import type { Technique, CellPosition } from '../types';

export interface CellElimination {
  pos: CellPosition;
  values: number[];
}

export interface CellPlacement {
  pos: CellPosition;
  value: number;
}

export interface TechniqueResult {
  technique: Technique;
  // Cells the technique is "highlighting" — used to render the hint.
  cells: CellPosition[];
  // Cells whose candidate set should shrink. May be empty.
  eliminations: CellElimination[];
  // Cells that get a confirmed value. May be empty.
  placements: CellPlacement[];
  // Brief human-readable explanation. Locale-stamped at render time.
  reason: string;
}

export type TechniqueFinder = (
  board: import('../types').Board,
  candidates: Uint16Array, // length 81
) => TechniqueResult | null;

export interface TechniqueDefinition {
  id: Technique;
  level: 1 | 2 | 3 | 4 | 5; // difficulty bucket — easy → master
  find: TechniqueFinder;
  nameVi: string;
  nameEn: string;
  nameJa: string;
}
