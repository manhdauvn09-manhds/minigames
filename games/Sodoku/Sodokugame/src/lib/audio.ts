// Lightweight sound effects via Web Audio API.
// No binary assets — every sound is synthesised from a single oscillator
// + gain envelope. Total cost ~50 LOC vs ~50KB of mp3 + a sprite loader.
//
// All effects respect `settingsStore.soundOn`; callers should guard
// before invoking, or use `audio.play(name)` which checks the setting.

import { useSettingsStore } from '../store';

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (_ctx) return _ctx;
  // AudioContext can only construct after a user gesture in modern
  // browsers. We lazy-create on first .play() call (always inside an
  // event handler) so creation never throws AutoplayPolicy errors.
  const Ctor: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  _ctx = new Ctor();
  return _ctx;
}

interface Tone {
  freq: number;
  duration: number;       // seconds
  type?: OscillatorType;  // default 'sine'
  gain?: number;          // 0..1, default 0.06 (gentle)
}

function tone({ freq, duration, type = 'sine', gain = 0.06 }: Tone): void {
  const c = ctx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

function arpeggio(freqs: number[], step = 0.08): void {
  const c = ctx();
  freqs.forEach((f, i) => {
    setTimeout(() => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.05, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
      osc.connect(g).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.25);
    }, i * step * 1000);
  });
}

const SFX = {
  click:  () => tone({ freq: 600, duration: 0.04, gain: 0.04 }),
  place:  () => tone({ freq: 880, duration: 0.08, gain: 0.06 }),
  note:   () => tone({ freq: 440, duration: 0.04, gain: 0.04 }),
  erase:  () => tone({ freq: 220, duration: 0.05, gain: 0.05 }),
  hint:   () => arpeggio([523.25, 659.25, 783.99]),  // C-E-G major
  win:    () => arpeggio([523.25, 659.25, 783.99, 1046.5], 0.12),
  lose:   () => arpeggio([440, 349.23, 261.63], 0.15), // descending
  achieve: () => arpeggio([783.99, 1046.5, 1318.51], 0.1),
} as const;

export type SfxName = keyof typeof SFX;

export const audio = {
  play(name: SfxName): void {
    if (!useSettingsStore.getState().soundOn) return;
    try { SFX[name](); } catch { /* AudioContext suspended — ignore */ }
  },
};
