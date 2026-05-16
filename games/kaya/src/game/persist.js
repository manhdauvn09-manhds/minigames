/* ============================================================================
 * Persistence helpers -- per-level scoreboard + in-progress resume.
 * ----------------------------------------------------------------------------
 * Two independent LocalStorage features live here:
 *
 * 1. SCOREBOARD  keyed by `kaya:score:<level>` -> { w, l, d }
 *    Bumped once per completed game by main.js's verdict handler.
 *
 * 2. RESUME STATE keyed by `kaya:resume` -> {
 *        v: 1,                     // format version, bump on breaking changes
 *        size, level,              // derived game config
 *        firstChoice, humanColor, botColor,
 *        history: [[r, c], ...],   // compact move list (replay-driven)
 *        startedAt, savedAt        // for elapsed/stale checks
 *      }
 *    Re-applied on boot so a page refresh mid-game does not lose the
 *    position. Cleared on New Game. If applying throws (schema drift,
 *    corrupt write) we silently fall back to a fresh game -- the
 *    "always playable" invariant wins over perfect resume.
 * ============================================================================ */

const RESUME_KEY = 'kaya:resume';
const SCORE_PREFIX = 'kaya:score:';
const RESUME_VERSION = 1;
const NAME_KEY = 'kaya:player';
const MATCHLOG_KEY = 'kaya:matchlog';
const MATCHLOG_CAP = 50;

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}
function safeDel(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}

// ── Scoreboard ────────────────────────────────────────────────────────────
export function getScore(level) {
  const raw = safeGet(SCORE_PREFIX + level);
  if (!raw) return { w: 0, l: 0, d: 0 };
  try {
    const s = JSON.parse(raw);
    return { w: s.w | 0, l: s.l | 0, d: s.d | 0 };
  } catch (_) {
    return { w: 0, l: 0, d: 0 };
  }
}

export function bumpScore(level, outcome /* 'w' | 'l' | 'd' */) {
  if (!['w', 'l', 'd'].includes(outcome)) return;
  const s = getScore(level);
  s[outcome] += 1;
  safeSet(SCORE_PREFIX + level, JSON.stringify(s));
  return s;
}

// ── Resume state ──────────────────────────────────────────────────────────
/** Write a snapshot of the in-progress game. Called after every move.
 *  The history is stored as [[r, c], ...] rather than the full move
 *  objects so the blob stays small (even a 225-move game fits in <3 KB). */
export function saveResume(state) {
  if (!state || !state.history) return;
  const payload = {
    v: RESUME_VERSION,
    size: state.size,
    level: state.level,
    firstChoice: state.firstChoice,
    humanColor: state.humanColor,
    botColor: state.botColor,
    history: state.history.map(m => [m.r, m.c]),
    startedAt: state.startedAt,
    savedAt: Date.now(),
  };
  safeSet(RESUME_KEY, JSON.stringify(payload));
}

/** Load + basic-validate. Returns null if no resume data, corrupt, or
 *  wrong schema version. Caller decides what to do with it. */
export function loadResume() {
  const raw = safeGet(RESUME_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s || s.v !== RESUME_VERSION) return null;
    if (!Array.isArray(s.history)) return null;
    if (s.size !== 15 && s.size !== 19) return null;
    if (s.level < 1 || s.level > 5) return null;
    return s;
  } catch (_) {
    return null;
  }
}

export function clearResume() {
  safeDel(RESUME_KEY);
}

// ── Player name ────────────────────────────────────────────────────────────
export function getName() {
  return safeGet(NAME_KEY) || '';
}
export function setName(n) {
  const trimmed = (n || '').trim().slice(0, 24);
  if (trimmed) safeSet(NAME_KEY, trimmed);
  else         safeDel(NAME_KEY);
  return trimmed;
}

// ── Match log ──────────────────────────────────────────────────────────────
/** Append one completed game to the match log. Cap at MATCHLOG_CAP (oldest
 *  dropped on overflow). Returns the trimmed list. */
export function appendMatch(entry) {
  const list = getMatches();
  const now = Date.now();
  const safe = {
    t: now,
    name: (entry.name || '').slice(0, 24),
    level: entry.level | 0,
    outcome: entry.outcome === 'w' || entry.outcome === 'l' ? entry.outcome : 'd',
    moves: entry.moves | 0,
    durationMs: entry.durationMs | 0,
  };
  list.unshift(safe);
  const trimmed = list.slice(0, MATCHLOG_CAP);
  safeSet(MATCHLOG_KEY, JSON.stringify(trimmed));
  return trimmed;
}
export function getMatches() {
  const raw = safeGet(MATCHLOG_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MATCHLOG_CAP) : [];
  } catch (_) {
    return [];
  }
}
export function clearMatches() {
  safeDel(MATCHLOG_KEY);
}
