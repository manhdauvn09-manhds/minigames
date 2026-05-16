/* ============================================================================
 * Sound FX -- lightweight Web Audio synthesis
 * ----------------------------------------------------------------------------
 * Three cues, all generated at runtime so there are zero audio files
 * in the build context:
 *
 *   stone() -- short "clack" on each placement (~50 ms, triangle +
 *              band-pass + quick exponential decay)
 *   win()   -- three-note ascending arpeggio (C5, E5, G5, ~90 ms each)
 *   lose()  -- two-note minor drop (E4 -> A3, ~180 ms each, softer attack)
 *
 * All cues respect the same mute flag, and an AudioContext is lazily
 * created on first call because browsers require a user gesture before
 * audio can start. If the context fails to start (e.g. private tab
 * restriction), the API silently no-ops -- the game still plays.
 *
 * Volume is deliberately subdued (master gain 0.22 for stone,
 * 0.28 for verdict). The Kaya brand guidance is "respect the player";
 * we don't bonk them.
 * ============================================================================ */

let _ctx = null;
let _muted = false;

function ensureCtx() {
  if (_ctx) return _ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
  } catch (_) {
    _ctx = null;
  }
  return _ctx;
}

export function setMuted(v) {
  _muted = !!v;
}

export function isMuted() {
  return _muted;
}

// ── Primitives ────────────────────────────────────────────────────────────
function blip({ freq, type = 'triangle', dur = 0.08, gain = 0.22,
                filterFreq, filterQ, attack = 0.002 }) {
  if (_muted) return;
  const ctx = ensureCtx();
  if (!ctx) return;

  // Browsers may leave the context in 'suspended' until the first
  // gesture; resume is a no-op if already running.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  let lastNode = osc;
  if (filterFreq) {
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(filterFreq, t0);
    if (filterQ) f.Q.setValueAtTime(filterQ, t0);
    lastNode.connect(f);
    lastNode = f;
  }
  lastNode.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// ── Public cues ───────────────────────────────────────────────────────────
export function stone() {
  // "Wood" clack: two overlapping short blips, one low (thunk), one
  // mid-high (edge click). Keep both very short; together they sound
  // like a stone hitting a board.
  blip({ freq: 220, type: 'triangle', dur: 0.07, gain: 0.18,
         filterFreq: 560, filterQ: 3, attack: 0.001 });
  blip({ freq: 1100, type: 'triangle', dur: 0.05, gain: 0.10,
         filterFreq: 2400, filterQ: 4, attack: 0.001 });
}

export function win() {
  const notes = [523.25, 659.25, 783.99];   // C5 E5 G5
  notes.forEach((f, i) => {
    setTimeout(() => blip({
      freq: f, type: 'triangle', dur: 0.22, gain: 0.26,
      filterFreq: f * 2, filterQ: 2, attack: 0.006,
    }), i * 110);
  });
}

export function lose() {
  const notes = [329.63, 220.00];           // E4, A3
  notes.forEach((f, i) => {
    setTimeout(() => blip({
      freq: f, type: 'sine', dur: 0.38, gain: 0.22,
      filterFreq: f * 1.5, filterQ: 1.5, attack: 0.01,
    }), i * 180);
  });
}
