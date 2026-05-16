import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, checkUnlocks } from '../achievements';

const baseOutcome = {
  difficulty: 1 as const,
  timeSeconds: 600,
  mistakes: 1,
  hintsUsed: 1,
  isDaily: false,
  dailyStreak: 0,
};

describe('achievements catalog', () => {
  it('all entries have required fields', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.nameVi).toBeTruthy();
      expect(a.nameEn).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(typeof a.check).toBe('function');
    }
  });

  it('IDs are unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('achievements — first_win', () => {
  it('unlocks on any finished game', () => {
    const r = checkUnlocks(baseOutcome, new Set());
    expect(r.find((a) => a.id === 'first_win')).toBeDefined();
  });

  it('does NOT unlock when already in the set', () => {
    const r = checkUnlocks(baseOutcome, new Set(['first_win']));
    expect(r.find((a) => a.id === 'first_win')).toBeUndefined();
  });
});

describe('achievements — flawless / no_hints', () => {
  it('flawless requires zero mistakes', () => {
    const r = checkUnlocks({ ...baseOutcome, mistakes: 0 }, new Set());
    expect(r.find((a) => a.id === 'flawless')).toBeDefined();
  });

  it('no_hints requires zero hints', () => {
    const r = checkUnlocks({ ...baseOutcome, hintsUsed: 0 }, new Set());
    expect(r.find((a) => a.id === 'no_hints')).toBeDefined();
  });
});

describe('achievements — speedruns', () => {
  it('speedrun_easy: L1 < 180s', () => {
    expect(checkUnlocks({ ...baseOutcome, difficulty: 1, timeSeconds: 179 }, new Set())
      .find((a) => a.id === 'speedrun_easy')).toBeDefined();
    expect(checkUnlocks({ ...baseOutcome, difficulty: 1, timeSeconds: 181 }, new Set())
      .find((a) => a.id === 'speedrun_easy')).toBeUndefined();
    // Wrong level → no unlock
    expect(checkUnlocks({ ...baseOutcome, difficulty: 2, timeSeconds: 100 }, new Set())
      .find((a) => a.id === 'speedrun_easy')).toBeUndefined();
  });
});

describe('achievements — daily streaks', () => {
  it('streak_3 needs daily + streak >= 3', () => {
    expect(checkUnlocks({ ...baseOutcome, isDaily: true, dailyStreak: 3 }, new Set())
      .find((a) => a.id === 'streak_3')).toBeDefined();
    expect(checkUnlocks({ ...baseOutcome, isDaily: false, dailyStreak: 30 }, new Set())
      .find((a) => a.id === 'streak_3')).toBeUndefined();
  });
});
