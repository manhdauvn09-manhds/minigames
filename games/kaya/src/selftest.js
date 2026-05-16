/* ============================================================================
 * Self-test harness
 * ----------------------------------------------------------------------------
 * Plays N games of Level 5 vs Level 1, alternating who opens, and
 * tallies W / L / D. Per the PROMPT spec the pass threshold is
 * "L5 must win >=9/10". Output streams line-by-line to the <pre>
 * element so the user sees progress even during the 2-3 s L5 thinks.
 *
 * Runs entirely on the main thread via pickMoveSync -- spinning up the
 * worker for each move in a 10-game run would add 10-20 s of overhead
 * for essentially zero parallelism benefit (we await each move).
 * ============================================================================ */

import { Board } from './game/board.js';
import { BLACK, WHITE } from './game/coords.js';
import { pickMoveSync } from './ai/index.js';

const $ = id => document.getElementById(id);

let running = false;

function logLine(s) {
  const el = $('log');
  el.textContent += (el.textContent.endsWith('\n') || el.textContent === '' ? '' : '\n') + s;
  el.scrollTop = el.scrollHeight;
}

function resetCounters() {
  $('log').textContent = '';
  $('winL5').textContent = '0';
  $('winL1').textContent = '0';
  $('winDr').textContent = '0';
  $('verdict').textContent = '—';
  $('verdict').classList.remove('pass', 'fail');
}

async function playGame(gameIdx, size, l5First) {
  const b = new Board({ size, firstPlayer: BLACK });
  // L5 is always BLACK if l5First, else WHITE.
  const l5Color = l5First ? BLACK : WHITE;
  const l1Color = l5First ? WHITE : BLACK;

  let ply = 0;
  while (b.winner === 0 && ply < size * size) {
    const toMove = b.turn;
    const level = toMove === l5Color ? 5 : 1;
    const pick = pickMoveSync(level, b.cells, b.size, toMove, 2500);
    if (!pick) break;
    b.place(pick.r, pick.c);
    ply++;
    // Yield every few plies so the event loop can repaint.
    if (ply % 4 === 0) await new Promise(r => setTimeout(r, 0));
  }
  let winner;
  if (b.winner === l5Color)       winner = 'L5';
  else if (b.winner === l1Color)  winner = 'L1';
  else                            winner = 'DR';
  const opener = l5First ? 'L5' : 'L1';
  logLine(`  game ${gameIdx.toString().padStart(2, ' ')}  opener=${opener}  plies=${ply.toString().padStart(3, ' ')}  -> ${winner}`);
  return winner;
}

async function run() {
  if (running) return;
  running = true;
  resetCounters();
  const n    = Math.max(1, Math.min(50, Number($('nGames').value) || 10));
  const size = Math.max(5,  Math.min(19, Number($('bSize').value) || 15));
  logLine(`Self-test: L5 vs L1, n=${n}, board=${size}x${size}`);
  logLine(`Starting…`);
  const t0 = performance.now();

  let w5 = 0, w1 = 0, dr = 0;
  for (let i = 1; i <= n; i++) {
    // Alternate opener so first-move advantage cancels across the run.
    const l5First = (i % 2 === 1);
    const res = await playGame(i, size, l5First);
    if (res === 'L5')      { w5++; $('winL5').textContent = w5; }
    else if (res === 'L1') { w1++; $('winL1').textContent = w1; }
    else                   { dr++; $('winDr').textContent = dr; }
  }
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  logLine(`Done in ${secs}s`);
  // Spec: L5 must win >= ceil(n * 0.9) out of n (for n=10, >=9).
  const pass = w5 >= Math.ceil(n * 0.9);
  const v = $('verdict');
  v.textContent = pass ? 'PASS' : 'FAIL';
  v.classList.add(pass ? 'pass' : 'fail');
  logLine(pass
    ? `OK: L5 won ${w5}/${n} >= ${Math.ceil(n * 0.9)} required`
    : `FAIL: L5 won ${w5}/${n} < ${Math.ceil(n * 0.9)} required`);
  running = false;
}

$('btnRun').addEventListener('click', () => { run().catch(err => {
  logLine('[error] ' + (err?.message || err));
  running = false;
}); });
$('btnClear').addEventListener('click', () => { resetCounters(); });
