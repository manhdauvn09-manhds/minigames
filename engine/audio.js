// Minimal web audio context for beeps and sound effects
export const Audio = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  beep(freq = 440, duration = 0.1, vol = 0.3) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  },

  pop() {
    this.beep(600, 0.05, 0.2);
  },

  success() {
    this.beep(800, 0.1, 0.3);
    setTimeout(() => this.beep(1000, 0.1, 0.3), 100);
  },

  error() {
    this.beep(300, 0.2, 0.2);
  }
};
