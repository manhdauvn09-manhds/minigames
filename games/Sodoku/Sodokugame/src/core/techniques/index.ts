// Technique registry — ordered ascending by difficulty so the solver
// can iterate `TECHNIQUES_BY_DIFFICULTY` until one fires.
//
// `level` matches DIFFICULTY_CONFIG.maxTechnique caps:
//   L1 generator stops at HIDDEN_SINGLE
//   L2 stops at NAKED_PAIR
//   L3 stops at POINTING_PAIR
//   L4 stops at X_WING
//   L5 stops at XY_WING
//
// Stubs (return null) are kept in the registry so existing consumers
// don't have to special-case "implemented yet" — the solver simply
// finds nothing and moves on. They become real implementations in
// Phase 2.5 without any caller change.

import { Technique } from '../types';
import type { TechniqueDefinition } from './types';

import { findNakedSingle, findHiddenSingle } from './singles';
import {
  findNakedPair, findHiddenPair, findNakedTriple, findHiddenTriple,
} from './pairs';
import { findPointingPair, findBoxLineReduction } from './intersection';
import { findXWing, findSwordfish } from './fish';
import { findXYWing } from './chains';

export const TECHNIQUES_BY_DIFFICULTY: TechniqueDefinition[] = [
  { id: Technique.NAKED_SINGLE,       level: 1, find: findNakedSingle,
    nameVi: 'Ô duy nhất',           nameEn: 'Naked Single',  nameJa: '裸シングル' },
  { id: Technique.HIDDEN_SINGLE,      level: 1, find: findHiddenSingle,
    nameVi: 'Số ẩn đơn',            nameEn: 'Hidden Single', nameJa: '隠れシングル' },
  { id: Technique.NAKED_PAIR,         level: 2, find: findNakedPair,
    nameVi: 'Cặp lộ',                nameEn: 'Naked Pair',    nameJa: '裸ペア' },
  { id: Technique.HIDDEN_PAIR,        level: 2, find: findHiddenPair,
    nameVi: 'Cặp ẩn',                nameEn: 'Hidden Pair',   nameJa: '隠れペア' },
  { id: Technique.NAKED_TRIPLE,       level: 3, find: findNakedTriple,
    nameVi: 'Bộ ba lộ',              nameEn: 'Naked Triple',  nameJa: '裸トリプル' },
  { id: Technique.HIDDEN_TRIPLE,      level: 3, find: findHiddenTriple,
    nameVi: 'Bộ ba ẩn',              nameEn: 'Hidden Triple', nameJa: '隠れトリプル' },
  { id: Technique.POINTING_PAIR,      level: 3, find: findPointingPair,
    nameVi: 'Cặp chỉ hướng',        nameEn: 'Pointing Pair', nameJa: 'ポインティングペア' },
  { id: Technique.BOX_LINE_REDUCTION, level: 3, find: findBoxLineReduction,
    nameVi: 'Hộp-dòng',              nameEn: 'Box-Line Reduction', nameJa: 'ボックスライン' },
  { id: Technique.X_WING,             level: 4, find: findXWing,
    nameVi: 'X-Wing',                nameEn: 'X-Wing',        nameJa: 'X-Wing' },
  { id: Technique.SWORDFISH,          level: 4, find: findSwordfish,
    nameVi: 'Cá kiếm',               nameEn: 'Swordfish',     nameJa: '剣魚' },
  { id: Technique.XY_WING,            level: 5, find: findXYWing,
    nameVi: 'XY-Wing',               nameEn: 'XY-Wing',       nameJa: 'XY-Wing' },
];

/** Subset of techniques permitted at or below `maxLevel`. */
export function techniquesUpToLevel(maxLevel: 1 | 2 | 3 | 4 | 5): TechniqueDefinition[] {
  return TECHNIQUES_BY_DIFFICULTY.filter((t) => t.level <= maxLevel);
}

export type { TechniqueDefinition, TechniqueResult, TechniqueFinder } from './types';
