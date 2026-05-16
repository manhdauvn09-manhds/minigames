/* ============================================================================
 * Board renderer
 * ----------------------------------------------------------------------------
 * Builds three layers inside the <div class="board"> host:
 *
 *   1. <svg class="board-grid">   grid lines + hoshi dots (pointer-events off)
 *   2. <div class="board-cells">  15x15 (or 19x19) .cell nodes, each with a
 *                                 hover-ghost child. Captures clicks.
 *   3. <svg class="win-line">     straight line drawn across the winning run
 *                                 when a game ends.
 *
 * Design decision: CSS Grid + DOM stones (not Canvas). The Kaya Design
 * System ships a full stylistic spec for the stone (radial gradient +
 * specular highlight + placement animation), expressed as CSS custom
 * gradients. Re-implementing those in <canvas> would mean hand-porting
 * the whole design layer with no benefit -- DOM stones give us free
 * focus rings, keyboard nav, accessibility labels, and "ghost on hover"
 * via the existing board.css rules.
 * ============================================================================ */

import { idxOf, rcOf, hoshiPoints, notation, BLACK, WHITE } from './coords.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class BoardRenderer {
  /** @param host  The <div class="board"> to mount into. */
  constructor(host) {
    this.host = host;
    this.size = 0;
    this.cellsEl = null;
    this.gridSvg = null;
    this.winSvg = null;
    this.cbMode = false;   // colourblind skin
    this._clickHandler = null;
  }

  /** Build / rebuild the board for `size`. Safe to call repeatedly.
   *  A single delegated click listener is attached to the new cellsEl
   *  and calls `this._clickHandler` if set -- that way `onCellClick`
   *  can be called many times without stacking listeners. */
  mount(size) {
    this.size = size;
    this.host.innerHTML = '';                 // wipe placeholder + old layers

    this.gridSvg = this._buildGrid(size);
    this.host.appendChild(this.gridSvg);

    this.cellsEl = document.createElement('div');
    this.cellsEl.className = 'board-cells';
    this.cellsEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    this.cellsEl.style.gridTemplateRows = `repeat(${size}, 1fr)`;
    this.cellsEl.setAttribute('role', 'grid');
    this.cellsEl.addEventListener('click', e => {
      if (!this._clickHandler) return;
      const cell = e.target.closest('.cell');
      if (!cell || !this.cellsEl.contains(cell)) return;
      if (cell.classList.contains('occupied')) return;
      this._clickHandler(Number(cell.dataset.r), Number(cell.dataset.c), cell);
    });

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.tabIndex = -1;                   // focusable only programmatically
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${notation(r, c, size)} empty`);

        const ghost = document.createElement('div');
        ghost.className = 'ghost';
        cell.appendChild(ghost);

        this.cellsEl.appendChild(cell);
      }
    }
    this.host.appendChild(this.cellsEl);

    // Reflect turn colour on parent via data attribute -- board.css +
    // app.css-free styling uses .board-cells[data-turn="..."] selectors.
    this.cellsEl.dataset.turn = 'black';
    this.updateGhostColour(BLACK);

    // Dim the host's placeholder text if it ever renders again.
    // Create the win-line SVG up-front so animation insert is cheap later.
    this.winSvg = document.createElementNS(SVG_NS, 'svg');
    this.winSvg.setAttribute('class', 'win-line');
    this.winSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    this.winSvg.setAttribute('preserveAspectRatio', 'none');
    this.host.appendChild(this.winSvg);
  }

  _buildGrid(size) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'board-grid');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    // Horizontal + vertical lines pass through CELL CENTRES. Traditional
    // Go/Gomoku boards put stones on intersections; we make each cell
    // represent one intersection by drawing lines at (i + 0.5).
    for (let i = 0; i < size; i++) {
      const h = document.createElementNS(SVG_NS, 'line');
      h.setAttribute('x1', 0.5);
      h.setAttribute('y1', i + 0.5);
      h.setAttribute('x2', size - 0.5);
      h.setAttribute('y2', i + 0.5);
      svg.appendChild(h);

      const v = document.createElementNS(SVG_NS, 'line');
      v.setAttribute('x1', i + 0.5);
      v.setAttribute('y1', 0.5);
      v.setAttribute('x2', i + 0.5);
      v.setAttribute('y2', size - 0.5);
      svg.appendChild(v);
    }
    for (const [r, c] of hoshiPoints(size)) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'hoshi');
      dot.setAttribute('cx', c + 0.5);
      dot.setAttribute('cy', r + 0.5);
      dot.setAttribute('r', 0.15);
      svg.appendChild(dot);
    }
    return svg;
  }

  /** Register the click handler. One listener is attached in mount();
   *  this just swaps the stored callback so reconnect-on-newGame is
   *  safe without stacking listeners. */
  onCellClick(fn) {
    this._clickHandler = fn;
  }

  /** Render a stone for a completed move. Animation comes from board.css
   *  `@keyframes placeStone`. */
  placeStone(r, c, player) {
    const cell = this._cellAt(r, c);
    if (!cell) return;
    // Remove ghost to stop hover preview on this cell.
    cell.classList.add('occupied');
    const stone = document.createElement('div');
    stone.className = `stone ${player === BLACK ? 'black' : 'white'}`;
    cell.appendChild(stone);
    cell.setAttribute('aria-label',
      `${notation(r, c, this.size)} ${player === BLACK ? 'black' : 'white'}`);
  }

  /** Remove the stone at (r,c). Used by undo. */
  removeStone(r, c) {
    const cell = this._cellAt(r, c);
    if (!cell) return;
    cell.classList.remove('occupied');
    cell.querySelectorAll('.stone').forEach(s => s.remove());
    cell.setAttribute('aria-label', `${notation(r, c, this.size)} empty`);
  }

  /** Switch the ghost-preview colour that appears on hover. */
  updateGhostColour(player) {
    const klass = player === BLACK ? 'ghost-black' : 'ghost-white';
    const alt   = player === BLACK ? 'ghost-white' : 'ghost-black';
    this.cellsEl.dataset.turn = player === BLACK ? 'black' : 'white';
    // Loop is fine -- 225 elements, once per move.
    this.cellsEl.querySelectorAll('.ghost').forEach(g => {
      g.classList.add(klass);
      g.classList.remove(alt);
    });
  }

  /** Mark the winning run + draw the line overlay. */
  markWin(line) {
    if (!line || !line.length) return;
    for (const idx of line) {
      const [r, c] = rcOf(idx, this.size);
      const cell = this._cellAt(r, c);
      if (cell) cell.querySelector('.stone')?.classList.add('winning');
    }
    const [r0, c0] = rcOf(line[0], this.size);
    const [r1, c1] = rcOf(line[line.length - 1], this.size);
    const ln = document.createElementNS(SVG_NS, 'line');
    ln.setAttribute('x1', c0 + 0.5);
    ln.setAttribute('y1', r0 + 0.5);
    ln.setAttribute('x2', c1 + 0.5);
    ln.setAttribute('y2', r1 + 0.5);
    this.winSvg.innerHTML = '';
    this.winSvg.appendChild(ln);
  }

  clearWin() {
    this.winSvg.innerHTML = '';
    this.cellsEl.querySelectorAll('.stone.winning')
      .forEach(s => s.classList.remove('winning'));
  }

  /** Toggle colour-blind stone skin. Board.css scopes `.cb` rules to
   *  a parent class; we put it on the host. */
  setColorblind(on) {
    this.cbMode = !!on;
    this.host.classList.toggle('cb', this.cbMode);
  }

  /** Show / hide the "bot is thinking" translucent overlay on the board.
   *  Used from PHASE 5 onward; safe to call now (no-op if already in sync). */
  setThinking(on) {
    let overlay = this.host.querySelector('.thinking-overlay');
    if (on && !overlay) {
      overlay = document.createElement('div');
      overlay.className = 'thinking-overlay';
      this.host.appendChild(overlay);
    } else if (!on && overlay) {
      overlay.remove();
    }
  }

  _cellAt(r, c) {
    return this.cellsEl.children[r * this.size + c] || null;
  }
}
