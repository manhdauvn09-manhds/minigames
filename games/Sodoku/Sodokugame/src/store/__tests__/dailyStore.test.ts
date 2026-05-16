import { beforeEach, describe, expect, it } from 'vitest';
import { useDailyStore, todayKey } from '../dailyStore';

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useDailyStore.getState().reset();
});

describe('dailyStore', () => {
  it('starts with empty history + zero streaks', () => {
    const s = useDailyStore.getState();
    expect(s.history).toEqual({});
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(0);
  });

  it('recordFinish bumps current + longest streak', () => {
    useDailyStore.getState().recordFinish({
      date: todayKey(),
      timeSeconds: 120,
      mistakes: 0,
      hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    expect(useDailyStore.getState().currentStreak).toBe(1);
    expect(useDailyStore.getState().longestStreak).toBe(1);
  });

  it('isDateComplete reflects history', () => {
    const today = todayKey();
    expect(useDailyStore.getState().isDateComplete(today)).toBe(false);
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 100, mistakes: 0, hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    expect(useDailyStore.getState().isDateComplete(today)).toBe(true);
  });

  it('keeps the better attempt on re-record (fewer mistakes)', () => {
    const today = todayKey();
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 100, mistakes: 3, hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 200, mistakes: 0, hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    expect(useDailyStore.getState().history[today].timeSeconds).toBe(200);
    expect(useDailyStore.getState().history[today].mistakes).toBe(0);
  });

  it('keeps the better attempt on re-record (faster time, same mistakes)', () => {
    const today = todayKey();
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 200, mistakes: 1, hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 100, mistakes: 1, hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    expect(useDailyStore.getState().history[today].timeSeconds).toBe(100);
  });

  it('does NOT downgrade an existing better attempt', () => {
    const today = todayKey();
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 100, mistakes: 0, hintsUsed: 0,
      finishedAt: new Date().toISOString(),
    });
    useDailyStore.getState().recordFinish({
      date: today, timeSeconds: 999, mistakes: 5, hintsUsed: 9,
      finishedAt: new Date().toISOString(),
    });
    expect(useDailyStore.getState().history[today].timeSeconds).toBe(100);
    expect(useDailyStore.getState().history[today].mistakes).toBe(0);
  });
});
