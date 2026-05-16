/* ============================================================================
 * Kaya Caro -- main entry point (ES module)
 * ----------------------------------------------------------------------------
 * PHASE 6: UX polish. Adds over PHASE 5:
 *   - Sound FX for stone / win / lose (Web Audio, synthesised, respects mute)
 *   - W/L/D scoreboard per level, persisted per-level to localStorage
 *   - Resume-on-refresh: every move saves a compact snapshot; boot
 *     replays it into a fresh Board so a page reload doesn't lose state
 *   - Hint button (L1-2 only): flashes a 1.5 s ring on a suggested cell
 *   - Review mode: click any move-history row to rewind the visual
 *     position to that move. Board clicks + bot are gated while
 *     reviewing. Click the review chip or press Escape to exit.
 *   - Reduced-motion: relies on the CSS @media rule already in
 *     colors_and_type.css; no JS-driven motion here would need patching.
 * ============================================================================ */

import { Board } from './game/board.js';
import { BoardRenderer } from './game/render.js';
import { notation, BLACK, WHITE } from './game/coords.js';
import { pickMove, pickMoveSync } from './ai/index.js';
import { getWorkerClient } from './ai/workerClient.js';
import * as sound from './game/sound.js';
import * as persist from './game/persist.js';

const STORAGE_THEME = 'kaya:theme';
const STORAGE_SOUND = 'kaya:sound';
const STORAGE_LEVEL = 'kaya:level';
const STORAGE_CB    = 'kaya:colorblind';
const STORAGE_FIRST = 'kaya:first';
const STORAGE_SIZE  = 'kaya:size';

// ── Module state ──────────────────────────────────────────────────────────
let board;
let renderer;
let aiClient;
let timerInterval = null;
let level       = 3;
let boardSize   = 15;
let firstChoice = 'you';
let humanColor  = BLACK;
let botColor    = WHITE;
let botPending  = false;
let botEpoch    = 0;
let reviewingAt = null;     // null = live, number = showing stones 0..N-1
let hintTimeout = null;
let playerName  = '';

/* ══════════════════════════════════════════════════════════════════════════
   ICONS + THEME + QUICK SETTINGS
   ══════════════════════════════════════════════════════════════════════════ */

function bootIcons() {
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

function applyTheme(t) {
  const theme = (t === 'dark' || t === 'light' || t === 'auto') ? t : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_THEME, theme); } catch (_) {}
  document.querySelectorAll('#themeSeg button').forEach(b => {
    const on = b.dataset.theme === theme;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
}

function bootTheme() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_THEME); } catch (_) {}
  applyTheme(saved || 'light');
  document.getElementById('themeSeg')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-theme]');
    if (b) applyTheme(b.dataset.theme);
  });
}

function bootSoundSwitch() {
  const sw = document.getElementById('soundSwitch');
  if (!sw) return;
  let on = true;
  try { on = localStorage.getItem(STORAGE_SOUND) !== 'off'; } catch (_) {}
  const apply = v => {
    sw.classList.toggle('on', v);
    sw.setAttribute('aria-checked', v ? 'true' : 'false');
    sound.setMuted(!v);
    try { localStorage.setItem(STORAGE_SOUND, v ? 'on' : 'off'); } catch (_) {}
  };
  apply(on);
  const toggle = () => apply(!sw.classList.contains('on'));
  sw.addEventListener('click', toggle);
  sw.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   LEVEL METER + SCOREBOARD
   ══════════════════════════════════════════════════════════════════════════ */

const LEVEL_DESC = {
  1: 'Casual. The bot plays loose.',
  2: 'Easy. Basic heuristics, no lookahead.',
  3: 'Measured. Blocks common threats.',
  4: 'Sharp. Reads four moves ahead.',
  5: 'Ruthless. No mercy.',
};

function refreshScoreboard() {
  const s = persist.getScore(level);
  document.getElementById('recW').textContent = s.w;
  document.getElementById('recL').textContent = s.l;
  document.getElementById('recD').textContent = s.d;
  const total = s.w + s.l + s.d;
  const rate  = total ? Math.round((s.w * 100) / total) : 0;
  document.getElementById('recRate').textContent =
    total ? `${rate}% win rate · ${total} game${total === 1 ? '' : 's'}`
          : 'No games yet';
}

function applyLevel(n) {
  level = Math.max(1, Math.min(5, n | 0));
  document.querySelectorAll('#lvlMeter > div').forEach((bar, i) => {
    bar.classList.toggle('on', i < level);
  });
  document.getElementById('lvlN').textContent = level;
  document.getElementById('recLevel').textContent = level;
  document.getElementById('levelChip').textContent = `LEVEL ${level}`;
  document.getElementById('lvlDesc').textContent = LEVEL_DESC[level];
  document.getElementById('lvlMeter')?.setAttribute('aria-valuenow', level);

  // Settings-modal seg + helper text
  document.querySelectorAll('#diffSeg button').forEach(b => {
    const on = Number(b.dataset.level) === level;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  const diffHelp = document.getElementById('diffHelp');
  if (diffHelp) diffHelp.textContent = `Level ${level} · ${LEVEL_DESC[level].split('.')[0]}`;

  const hintBtn = document.getElementById('btnHint');
  if (hintBtn) {
    hintBtn.disabled = level > 2;
    hintBtn.title = level > 2
      ? 'Hints are available on level 1-2.'
      : 'Show a suggested move.';
  }

  refreshScoreboard();
  try { localStorage.setItem(STORAGE_LEVEL, String(level)); } catch (_) {}
}

function bootLevelMeter() {
  let saved = null;
  try { saved = Number(localStorage.getItem(STORAGE_LEVEL)); } catch (_) {}
  applyLevel(saved >= 1 && saved <= 5 ? saved : 3);

  const meter = document.getElementById('lvlMeter');
  if (!meter) return;
  meter.addEventListener('click', e => {
    const bar = e.target.closest('[data-level]');
    if (bar) applyLevel(Number(bar.dataset.level));
  });
  meter.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowDown') { applyLevel(level - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp')   { applyLevel(level + 1); e.preventDefault(); }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   STATUS CHIP + HISTORY PANEL
   ══════════════════════════════════════════════════════════════════════════ */

function updateStatusChip() {
  const chip  = document.getElementById('statusChip');
  const label = document.getElementById('statusLabel');
  if (!chip || !label) return;

  chip.classList.remove('turn-you', 'turn-bot', 'chip-review');
  chip.removeAttribute('role');
  chip.removeAttribute('tabindex');

  if (reviewingAt !== null) {
    chip.classList.add('chip-review');
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    label.textContent = `Reviewing ${reviewingAt}/${board.history.length} · exit`;
    return;
  }
  if (board.winner !== 0) return;
  const p = board.turn;
  if (p === humanColor) {
    chip.classList.add('turn-you');
    label.textContent = 'Your move.';
  } else {
    chip.classList.add('turn-bot');
    label.textContent = 'Bot is thinking.';
  }
}

function formatElapsed(ms) {
  const s  = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function clearHistory() {
  const root = document.getElementById('history');
  if (root) root.innerHTML = '<div class="history-empty">Play a move to begin.</div>';
}

function appendHistoryRow(move) {
  const root = document.getElementById('history');
  if (!root) return;
  root.querySelector('.history-empty')?.remove();
  const row = document.createElement('div');
  row.className = 'history-row';
  row.dataset.moveNo = String(move.moveNo);
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  const n = document.createElement('div'); n.className = 'n'; n.textContent = move.moveNo;
  const s = document.createElement('div'); s.className = 's ' + (move.player === BLACK ? 'sb' : 'sw');
  const c = document.createElement('div'); c.className = 'c'; c.textContent = notation(move.r, move.c, boardSize);
  const t = document.createElement('div'); t.className = 't'; t.textContent = formatElapsed(move.ts - board.startedAt);
  row.append(n, s, c, t);
  root.appendChild(row);
  row.scrollIntoView({ block: 'end' });
}

function popHistoryRow() {
  const root = document.getElementById('history');
  if (!root) return;
  const rows = root.querySelectorAll('.history-row');
  if (!rows.length) return;
  rows[rows.length - 1].remove();
  if (!root.querySelector('.history-row')) clearHistory();
}

function markActiveHistoryRow() {
  const root = document.getElementById('history');
  if (!root) return;
  root.querySelectorAll('.history-row').forEach(r => r.classList.remove('active'));
  if (reviewingAt !== null && reviewingAt > 0) {
    const row = root.querySelector(`.history-row[data-move-no="${reviewingAt}"]`);
    row?.classList.add('active');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   REVIEW MODE  -- click a history row to rewind the visual position
   ══════════════════════════════════════════════════════════════════════════ */

function enterReview(uptoMoveNo) {
  if (board.winner !== 0 && uptoMoveNo === board.history.length) return;   // already at end
  reviewingAt = Math.max(0, Math.min(board.history.length, uptoMoveNo));
  renderer.mount(boardSize);
  for (let i = 0; i < reviewingAt; i++) {
    const m = board.history[i];
    renderer.placeStone(m.r, m.c, m.player);
  }
  renderer.onCellClick(onCellClick);
  renderer.clearWin();
  renderer.updateGhostColour(board.turn);
  // `.reviewing` on the host suppresses hover ghosts so the paused
  // state reads visually (no preview on a board the user can't click).
  document.getElementById('board').classList.add('reviewing');
  updateStatusChip();
  markActiveHistoryRow();
}

function exitReview() {
  if (reviewingAt === null) return;
  reviewingAt = null;
  renderer.mount(boardSize);
  for (const m of board.history) renderer.placeStone(m.r, m.c, m.player);
  if (board.winLine) renderer.markWin(board.winLine);
  renderer.onCellClick(onCellClick);
  renderer.updateGhostColour(board.turn);
  document.getElementById('board').classList.remove('reviewing');
  updateStatusChip();
  markActiveHistoryRow();
}

/* ══════════════════════════════════════════════════════════════════════════
   TIMER
   ══════════════════════════════════════════════════════════════════════════ */

function tickTimer() {
  const el = document.getElementById('timer');
  if (el && board) el.textContent = formatElapsed(board.elapsedMs());
}
function startTimer() {
  stopTimer(); tickTimer();
  timerInterval = setInterval(tickTimer, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

/* ══════════════════════════════════════════════════════════════════════════
   VERDICT MODAL + WIN CELEBRATION
   ══════════════════════════════════════════════════════════════════════════ */

const CONFETTI_COLORS = [
  '#A63C28', // sumi
  '#D89B2C', // gold
  '#3F8A6A', // green
  '#2F6CA8', // blue
  '#E2C28C', // sand
  '#FFFFFF',
];

/** Sprinkle 28 css-only confetti diamonds into #confettiLayer with
 *  randomized colours, horizontal drift, delays, and durations. Cheap
 *  -- one append-burst, no rAF loop, animation handled by app.css. */
function spawnConfetti() {
  const layer = document.getElementById('confettiLayer');
  if (!layer) return;
  layer.innerHTML = '';
  const W = layer.clientWidth || 320;
  for (let i = 0; i < 28; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left  = `${Math.random() * 100}%`;
    el.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    el.style.setProperty('--cx', `${(Math.random() - 0.5) * W * 0.4}px`);
    el.style.animationDelay = `${(Math.random() * 0.6).toFixed(2)}s`;
    el.style.animationDuration = `${(2.0 + Math.random() * 1.4).toFixed(2)}s`;
    if (Math.random() < 0.4) el.style.borderRadius = '50%';
    layer.appendChild(el);
  }
}

/** Pick a victory line that namechecks the player. Defaults to neutral
 *  "Anonymous" if no name set. */
function celebrationSub(name) {
  const who = name || 'Anonymous';
  const lines = [
    `${who}, you ran the table.`,
    `Five in a row — well played, ${who}.`,
    `Kaya bows. Beautifully done, ${who}.`,
    `${who} wins. The bot is rebooting its ego.`,
    `Decisive play, ${who}. Pour yourself a tea.`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

function showVerdict({ outcome, title, eyebrow = 'Outcome', movesText, timeText, levelText }) {
  const scrim = document.getElementById('verdictScrim');
  const card  = document.getElementById('verdictCard');
  document.getElementById('verdictEyebrow').textContent = eyebrow;
  document.getElementById('verdictTitle').textContent = title;
  document.getElementById('verdictMoves').textContent = movesText;
  document.getElementById('verdictTime').textContent  = timeText;
  document.getElementById('verdictLevel').textContent = levelText;

  const sub = document.getElementById('verdictSub');
  const isWin = outcome === 'w';
  card.classList.toggle('celebrate', isWin);
  if (isWin) {
    sub.hidden = false;
    sub.textContent = celebrationSub(playerName);
    spawnConfetti();
  } else {
    sub.hidden = true;
    sub.textContent = '';
    document.getElementById('confettiLayer').innerHTML = '';
  }

  scrim.hidden = false;
  document.body.style.overflow = 'hidden';
}

function hideVerdict() {
  const scrim = document.getElementById('verdictScrim');
  if (!scrim) return;
  scrim.hidden = true;
  document.body.style.overflow = '';
  document.getElementById('verdictCard')?.classList.remove('celebrate');
  document.getElementById('confettiLayer').innerHTML = '';
}

/* ══════════════════════════════════════════════════════════════════════════
   PERSISTENCE GLUE
   ══════════════════════════════════════════════════════════════════════════ */

function snapshotForResume() {
  return {
    size: board.size,
    level,
    firstChoice,
    humanColor,
    botColor,
    history: board.history,
    startedAt: board.startedAt,
  };
}

function saveResumeNow() {
  if (!board) return;
  if (board.winner !== 0) { persist.clearResume(); return; }
  persist.saveResume(snapshotForResume());
}

function tryApplyResume() {
  const s = persist.loadResume();
  if (!s) return false;
  if (!Array.isArray(s.history) || s.history.length === 0) return false;
  // Accept board-size / level / first-choice from the save.
  boardSize   = s.size;
  level       = s.level;
  firstChoice = s.firstChoice;
  humanColor  = s.humanColor;
  botColor    = s.botColor;
  // Replay moves into a fresh engine.
  board.reset({ size: boardSize, firstPlayer: BLACK });
  renderer.mount(boardSize);
  renderer.onCellClick(onCellClick);
  clearHistory();
  for (const [r, c] of s.history) {
    const m = board.place(r, c);
    if (!m) break;
    renderer.placeStone(m.r, m.c, m.player);
    appendHistoryRow(m);
  }
  // Restore the original startedAt so the elapsed timer continues.
  if (typeof s.startedAt === 'number') board.startedAt = s.startedAt;
  if (board.winLine) renderer.markWin(board.winLine);
  renderer.updateGhostColour(board.turn);
  // Reflect config in UI
  applyLevel(level);
  applyFirstChoiceUI(firstChoice);
  applySizeSegUI(boardSize);
  updateStatusChip();
  document.getElementById('btnUndo').disabled = board.history.length === 0;
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
   GAME FLOW
   ══════════════════════════════════════════════════════════════════════════ */

function outcomeTitle(move) {
  if (move.winLine) {
    if (move.player === humanColor) {
      return playerName ? `${playerName}, you won!` : 'You won!';
    }
    return 'Bot won.';
  }
  return 'Drawn.';
}

function onMove(move) {
  renderer.placeStone(move.r, move.c, move.player);
  appendHistoryRow(move);
  sound.stone();
  document.getElementById('btnUndo').disabled = false;

  if (move.winLine || board.winner === 3) {
    if (move.winLine) renderer.markWin(move.winLine);
    stopTimer();
    // Outcome → scoreboard, sound cue, match log, verdict, clear resume.
    let outcome = 'd';
    if (move.winLine) outcome = move.player === humanColor ? 'w' : 'l';
    persist.bumpScore(level, outcome);
    persist.appendMatch({
      name: playerName,
      level,
      outcome,
      moves: board.history.length,
      durationMs: board.elapsedMs(),
    });
    refreshScoreboard();
    refreshMatchLog();
    if (outcome === 'w') sound.win();
    else if (outcome === 'l') sound.lose();
    persist.clearResume();
    showVerdict({
      outcome,
      eyebrow: outcome === 'w' ? 'Victory' : (outcome === 'l' ? 'Defeat' : 'Draw'),
      title: outcomeTitle(move),
      movesText: `${board.history.length} moves`,
      timeText:  formatElapsed(board.elapsedMs()),
      levelText: `Level ${level}`,
    });
    return;
  }

  renderer.updateGhostColour(board.turn);
  updateStatusChip();
  saveResumeNow();

  if (board.turn === botColor) triggerBot();
}

function onCellClick(r, c) {
  if (reviewingAt !== null) return;        // paused while reviewing
  if (board.winner !== 0) return;
  if (board.turn !== humanColor) return;
  if (botPending) return;
  const move = board.place(r, c);
  if (!move) return;
  onMove(move);
}

async function triggerBot() {
  if (botPending) return;
  if (board.winner !== 0) return;
  if (board.turn !== botColor) return;
  if (reviewingAt !== null) return;
  botPending = true;
  const myEpoch = botEpoch;
  renderer.setThinking(true);
  await new Promise(r => setTimeout(r, 180));

  try {
    if (myEpoch !== botEpoch) return;
    const pick = await pickMove(level, board.cells, board.size, botColor, aiClient);
    if (myEpoch !== botEpoch) return;
    if (!pick) return;
    const move = board.place(pick.r, pick.c);
    if (move) onMove(move);
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/superseded|cancelled/.test(msg)) {
      console.error('[kaya] bot pick failed:', err);
      try {
        const fallback = pickMoveSync(3, board.cells, board.size, botColor);
        if (myEpoch === botEpoch && fallback) {
          const move = board.place(fallback.r, fallback.c);
          if (move) onMove(move);
        }
      } catch (_) {}
    }
  } finally {
    if (myEpoch === botEpoch) {
      botPending = false;
      renderer.setThinking(false);
    }
  }
}

function resolveFirstPlayer() {
  let choice = firstChoice;
  if (choice === 'rand') choice = Math.random() < 0.5 ? 'you' : 'bot';
  if (choice === 'bot') { humanColor = WHITE; botColor = BLACK; }
  else                  { humanColor = BLACK; botColor = WHITE; }
}

function newGame() {
  hideVerdict();
  exitReview();
  resolveFirstPlayer();
  botEpoch++;
  botPending = false;
  aiClient?.cancel();
  renderer.setThinking(false);
  clearHintPulse();
  board.reset({ size: boardSize, firstPlayer: BLACK });
  renderer.mount(boardSize);
  renderer.onCellClick(onCellClick);
  renderer.updateGhostColour(BLACK);
  updateStatusChip();
  clearHistory();
  persist.clearResume();
  document.getElementById('btnUndo').disabled = true;
  startTimer();
  if (board.turn === botColor) triggerBot();
}

function undoTurn() {
  if (board.history.length === 0) return;
  if (reviewingAt !== null) exitReview();
  botEpoch++;
  botPending = false;
  aiClient?.cancel();
  renderer.setThinking(false);
  clearHintPulse();

  const undone = [];
  const first = board.undo();
  if (first) undone.push(first);
  if (first && first.player === botColor && board.history.length > 0) {
    const second = board.undo();
    if (second) undone.push(second);
  }
  for (const m of undone) renderer.removeStone(m.r, m.c);
  renderer.clearWin();
  renderer.updateGhostColour(board.turn);
  updateStatusChip();
  for (const _ of undone) popHistoryRow();
  hideVerdict();
  saveResumeNow();
  document.getElementById('btnUndo').disabled = board.history.length === 0;
  if (board.turn === botColor) triggerBot();
}

/* ══════════════════════════════════════════════════════════════════════════
   HINT
   ══════════════════════════════════════════════════════════════════════════ */

function clearHintPulse() {
  document.querySelectorAll('.cell.hint').forEach(c => c.classList.remove('hint'));
  if (hintTimeout) { clearTimeout(hintTimeout); hintTimeout = null; }
}

function showHint() {
  if (level > 2) return;
  if (board.winner !== 0) return;
  if (board.turn !== humanColor) return;
  if (reviewingAt !== null) return;
  clearHintPulse();
  // "Helpful" tier = L2's scoring. Don't use L3+ -- the prompt explicitly
  // restricts hints to weaker levels so a strong hint on L3 doesn't
  // short-circuit the learning curve.
  const pick = pickMoveSync(Math.min(level, 2), board.cells, board.size, humanColor);
  if (!pick) return;
  const cell = document.querySelector(
    `.cell[data-r="${pick.r}"][data-c="${pick.c}"]`);
  if (!cell) return;
  cell.classList.add('hint');
  hintTimeout = setTimeout(() => {
    cell.classList.remove('hint');
    hintTimeout = null;
  }, 1500);
}

/* ══════════════════════════════════════════════════════════════════════════
   MODALS + SETTINGS WIDGETS
   ══════════════════════════════════════════════════════════════════════════ */

function bindScrim(triggerId, scrimId, closeId) {
  const trg = triggerId ? document.getElementById(triggerId) : null;
  const scr = document.getElementById(scrimId);
  const cls = closeId ? document.getElementById(closeId) : null;
  if (!scr) return;
  const open  = () => { scr.hidden = false; document.body.style.overflow = 'hidden'; };
  const close = () => { scr.hidden = true;  document.body.style.overflow = ''; };
  if (trg) trg.addEventListener('click', open);
  if (cls) cls.addEventListener('click', close);
  scr.addEventListener('click', e => { if (e.target === scr) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !scr.hidden) close();
  });
}

function applyFirstChoiceUI(choice) {
  firstChoice = (choice === 'bot' || choice === 'rand') ? choice : 'you';
  document.querySelectorAll('#firstSeg button').forEach(b => {
    const on = b.dataset.first === firstChoice;
    b.classList.toggle('active', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  try { localStorage.setItem(STORAGE_FIRST, firstChoice); } catch (_) {}
}

function applySizeSegUI(size) {
  boardSize = size;
  document.querySelectorAll('#sizeSeg button').forEach(x => {
    const on = Number(x.dataset.size) === boardSize;
    x.classList.toggle('active', on);
    x.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  try { localStorage.setItem(STORAGE_SIZE, String(boardSize)); } catch (_) {}
}

function bootSettingsWidgets() {
  // Player name
  playerName = persist.getName();
  const nameInput = document.getElementById('playerName');
  if (nameInput) {
    nameInput.value = playerName;
    const persistName = () => {
      playerName = persist.setName(nameInput.value);
    };
    nameInput.addEventListener('input', persistName);
    nameInput.addEventListener('blur', persistName);
  }

  // Difficulty seg in settings modal — duplicates lvlMeter wiring so a
  // mid-modal level switch is live without closing the panel.
  document.getElementById('diffSeg')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-level]');
    if (!b) return;
    applyLevel(Number(b.dataset.level));
  });

  // Who goes first
  let savedFirst = null;
  try { savedFirst = localStorage.getItem(STORAGE_FIRST); } catch (_) {}
  applyFirstChoiceUI(savedFirst || 'you');
  document.getElementById('firstSeg')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-first]');
    if (!b) return;
    applyFirstChoiceUI(b.dataset.first);
    newGame();
  });

  // Board size
  let savedSize = null;
  try { savedSize = Number(localStorage.getItem(STORAGE_SIZE)); } catch (_) {}
  applySizeSegUI(savedSize === 15 || savedSize === 19 ? savedSize : 15);
  document.getElementById('sizeSeg')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-size]');
    if (!b) return;
    applySizeSegUI(Number(b.dataset.size));
    newGame();
  });

  // Colourblind skin
  const cb = document.getElementById('cbSwitch');
  if (cb) {
    let on = false;
    try { on = localStorage.getItem(STORAGE_CB) === 'on'; } catch (_) {}
    const apply = v => {
      cb.classList.toggle('on', v);
      cb.setAttribute('aria-checked', v ? 'true' : 'false');
      renderer.setColorblind(v);
      try { localStorage.setItem(STORAGE_CB, v ? 'on' : 'off'); } catch (_) {}
    };
    apply(on);
    const toggle = () => apply(!cb.classList.contains('on'));
    cb.addEventListener('click', toggle);
    cb.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   MATCH LOG (sidebar card)
   ══════════════════════════════════════════════════════════════════════════ */

function formatMatchDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (sameDay) return `today · ${hh}:${mm}`;
  const md = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${md} · ${hh}:${mm}`;
}

function refreshMatchLog() {
  const root = document.getElementById('matchLog');
  if (!root) return;
  const list = persist.getMatches();
  if (!list.length) {
    root.innerHTML = '<div class="log-empty">No matches yet.</div>';
    return;
  }
  root.innerHTML = '';
  for (const m of list) {
    const row = document.createElement('div');
    row.className = 'match-row';
    const badge = document.createElement('div');
    const cls = m.outcome === 'w' ? 'b-w' : (m.outcome === 'l' ? 'b-l' : 'b-d');
    badge.className = `badge ${cls}`;
    badge.textContent = m.outcome === 'w' ? 'WIN'
                      : m.outcome === 'l' ? 'LOSS'
                      : 'DRAW';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = `${m.name || 'Anonymous'} · L${m.level}`;
    const when = document.createElement('div');
    when.className = 'when';
    when.textContent = formatMatchDate(m.t);
    meta.append(who, when);

    const stats = document.createElement('div');
    stats.className = 'stats';
    stats.innerHTML =
      `<b>${m.moves}</b> moves<br/><b>${formatElapsed(m.durationMs)}</b>`;

    row.append(badge, meta, stats);
    root.appendChild(row);
  }
}

function bootMatchLogControls() {
  document.getElementById('btnClearLog')?.addEventListener('click', () => {
    if (!persist.getMatches().length) return;
    if (!confirm('Clear the match log?')) return;
    persist.clearMatches();
    refreshMatchLog();
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   HISTORY ROW CLICK (review) + STATUS CHIP CLICK (exit review)
   ══════════════════════════════════════════════════════════════════════════ */

function bootHistoryInteraction() {
  const root = document.getElementById('history');
  if (!root) return;
  const handle = row => {
    if (!row || !row.dataset.moveNo) return;
    const n = Number(row.dataset.moveNo);
    // Clicking the very last row while in review exits instead of
    // sitting at an "end state" that's identical to live.
    if (reviewingAt === n) exitReview();
    else enterReview(n);
  };
  root.addEventListener('click', e => handle(e.target.closest('.history-row')));
  root.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.history-row');
    if (!row) return;
    e.preventDefault();
    handle(row);
  });

  const chip = document.getElementById('statusChip');
  if (chip) {
    chip.addEventListener('click', () => {
      if (reviewingAt !== null) exitReview();
    });
    chip.addEventListener('keydown', e => {
      if (reviewingAt === null) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); exitReview(); }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ══════════════════════════════════════════════════════════════════════════ */

function bootShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // Escape: exit review (global). Handled before letter shortcuts.
    if (e.key === 'Escape' && reviewingAt !== null) {
      e.preventDefault();
      exitReview();
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'n')      { e.preventDefault(); newGame(); }
    else if (k === 'u') { e.preventDefault(); undoTurn(); }
    else if (k === '?') { e.preventDefault(); showHint(); }
    else if (k === ',') { e.preventDefault(); document.getElementById('btnSettings')?.click(); }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════════════════ */

function boot() {
  bootIcons();
  bootTheme();
  bootSoundSwitch();
  bootLevelMeter();

  bindScrim('btnSettings', 'settingsScrim', 'settingsClose');
  bindScrim(null, 'verdictScrim', 'verdictClose');
  document.getElementById('verdictReview')?.addEventListener('click', hideVerdict);
  document.getElementById('verdictPlayAgain')?.addEventListener('click', () => {
    hideVerdict();
    newGame();
  });

  board = new Board({ size: boardSize, firstPlayer: BLACK });
  renderer = new BoardRenderer(document.getElementById('board'));
  renderer.mount(boardSize);
  renderer.onCellClick(onCellClick);
  aiClient = getWorkerClient();

  bootSettingsWidgets();

  // Attempt resume. If it succeeds we already have the saved history
  // replayed + UI synced. Otherwise start a fresh game.
  const resumed = tryApplyResume();
  if (!resumed) {
    resolveFirstPlayer();
    updateStatusChip();
  }

  document.getElementById('btnNewGame')?.addEventListener('click', newGame);
  document.getElementById('btnUndo')?.addEventListener('click', undoTurn);
  document.getElementById('btnHint')?.addEventListener('click', showHint);

  bootHistoryInteraction();
  bootMatchLogControls();
  refreshMatchLog();
  bootShortcuts();

  if (window.lucide?.createIcons) window.lucide.createIcons();

  startTimer();
  if (!resumed && board.turn === botColor) triggerBot();
  // If we resumed and it's bot's turn, the bot picks up where it left off.
  else if (resumed && board.winner === 0 && board.turn === botColor) triggerBot();

  // Mute flag is read from localStorage during bootSoundSwitch; double-
  // check the sound system picked it up.
  // eslint-disable-next-line no-console
  console.log(`[kaya] phase 6 ready · level=${level} first=${firstChoice} resumed=${resumed}`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
