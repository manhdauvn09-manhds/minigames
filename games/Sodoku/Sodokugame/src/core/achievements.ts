// Achievement catalog — pure data; no persistence here. The store
// (src/store/achievementsStore.ts) checks each row against the just-
// finished game and unlocks any newly-eligible ones.
//
// Phase 7A backend will mirror these IDs so server-side achievements
// stay in lockstep with the client. Don't renumber existing ids;
// append new entries.

import type { DifficultyLevel } from './types';

export interface AchievementDef {
  id: string;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  icon: string; // emoji — keeps things asset-free for Phase 5
  /** Returns true when this achievement should unlock based on the
   * just-finished game's stats. */
  check: (g: GameOutcome) => boolean;
}

export interface GameOutcome {
  difficulty: DifficultyLevel;
  timeSeconds: number;
  mistakes: number;
  hintsUsed: number;
  isDaily: boolean;
  /** Current daily-streak value AFTER recording the finish.
   * 0 if non-daily. */
  dailyStreak: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_win',
    nameVi: 'Chiến thắng đầu tiên',
    nameEn: 'First Win',
    descVi: 'Hoàn thành ván đầu tiên.',
    descEn: 'Complete your first puzzle.',
    icon: '🥉',
    check: (g) => g.timeSeconds > 0,
  },
  {
    id: 'flawless',
    nameVi: 'Hoàn hảo',
    nameEn: 'Flawless',
    descVi: 'Thắng không có lỗi nào.',
    descEn: 'Win with zero mistakes.',
    icon: '✨',
    check: (g) => g.mistakes === 0,
  },
  {
    id: 'no_hints',
    nameVi: 'Không nhìn gợi ý',
    nameEn: 'Unaided',
    descVi: 'Thắng mà không dùng gợi ý.',
    descEn: 'Win without using a hint.',
    icon: '🧠',
    check: (g) => g.hintsUsed === 0,
  },
  {
    id: 'speedrun_easy',
    nameVi: 'Tốc độ dễ',
    nameEn: 'Easy Speedrun',
    descVi: 'Hoàn thành Dễ trong dưới 3 phút.',
    descEn: 'Finish Easy in under 3 minutes.',
    icon: '⚡',
    check: (g) => g.difficulty === 1 && g.timeSeconds < 180,
  },
  {
    id: 'speedrun_medium',
    nameVi: 'Tốc độ vừa',
    nameEn: 'Medium Speedrun',
    descVi: 'Hoàn thành Vừa trong dưới 6 phút.',
    descEn: 'Finish Medium in under 6 minutes.',
    icon: '⚡⚡',
    check: (g) => g.difficulty === 2 && g.timeSeconds < 360,
  },
  {
    id: 'expert_clear',
    nameVi: 'Chuyên gia',
    nameEn: 'Expert Clear',
    descVi: 'Hoàn thành ván Chuyên gia.',
    descEn: 'Complete an Expert puzzle.',
    icon: '🎯',
    check: (g) => g.difficulty === 4,
  },
  {
    id: 'master_clear',
    nameVi: 'Bậc thầy',
    nameEn: 'Master Clear',
    descVi: 'Hoàn thành ván Bậc thầy.',
    descEn: 'Complete a Master puzzle.',
    icon: '👑',
    check: (g) => g.difficulty === 5,
  },
  {
    id: 'streak_3',
    nameVi: 'Chuỗi 3 ngày',
    nameEn: '3-Day Streak',
    descVi: 'Hoàn thành Daily Challenge 3 ngày liên tiếp.',
    descEn: 'Daily Challenge 3 days in a row.',
    icon: '🔥',
    check: (g) => g.isDaily && g.dailyStreak >= 3,
  },
  {
    id: 'streak_7',
    nameVi: 'Chuỗi 7 ngày',
    nameEn: '7-Day Streak',
    descVi: 'Hoàn thành Daily Challenge 7 ngày liên tiếp.',
    descEn: 'Daily Challenge 7 days in a row.',
    icon: '🔥🔥',
    check: (g) => g.isDaily && g.dailyStreak >= 7,
  },
  {
    id: 'streak_30',
    nameVi: 'Chuỗi 30 ngày',
    nameEn: '30-Day Streak',
    descVi: 'Hoàn thành Daily Challenge 30 ngày liên tiếp.',
    descEn: 'Daily Challenge 30 days in a row.',
    icon: '🔥🔥🔥',
    check: (g) => g.isDaily && g.dailyStreak >= 30,
  },
];

export function checkUnlocks(
  outcome: GameOutcome,
  alreadyUnlocked: ReadonlySet<string>,
): AchievementDef[] {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.has(a.id) && a.check(outcome),
  );
}
