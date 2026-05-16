import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '../settingsStore';

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  useSettingsStore.getState().reset();
});

describe('settingsStore — defaults', () => {
  it('boots with sensible defaults', () => {
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('auto');
    expect(s.lang).toBe('vi');
    expect(s.soundOn).toBe(true);
    expect(s.autoNotes).toBe(false);
    expect(s.highlightPeers).toBe(true);
    expect(s.highlightSameValue).toBe(true);
    expect(s.showMistakes).toBe(true);
    expect(s.mistakeLimit).toBe(3);
  });
});

describe('settingsStore — setters', () => {
  it('setTheme changes theme', () => {
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('setLang changes language', () => {
    useSettingsStore.getState().setLang('ja');
    expect(useSettingsStore.getState().lang).toBe('ja');
  });

  it('toggle* flips booleans', () => {
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundOn).toBe(false);
    useSettingsStore.getState().toggleSound();
    expect(useSettingsStore.getState().soundOn).toBe(true);
  });

  it('setMistakeLimit clamps to [0, 99]', () => {
    useSettingsStore.getState().setMistakeLimit(-5);
    expect(useSettingsStore.getState().mistakeLimit).toBe(0);
    useSettingsStore.getState().setMistakeLimit(500);
    expect(useSettingsStore.getState().mistakeLimit).toBe(99);
    useSettingsStore.getState().setMistakeLimit(7);
    expect(useSettingsStore.getState().mistakeLimit).toBe(7);
  });

  it('reset returns to defaults', () => {
    useSettingsStore.getState().setTheme('dark');
    useSettingsStore.getState().setLang('en');
    useSettingsStore.getState().reset();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe('auto');
    expect(s.lang).toBe('vi');
  });
});
