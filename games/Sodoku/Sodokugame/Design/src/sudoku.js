/* Sudoku logic — generator, solver, conflict detection.
   Exposes a small global `Sudoku` object.
   Grids are 81-length arrays (row-major). 0 = empty. */
(function () {
  'use strict';

  // Deterministic PRNG so demos are reproducible. Swap for Math.random if wanted.
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function idx(r, c) { return r * 9 + c; }
  function rowOf(i) { return Math.floor(i / 9); }
  function colOf(i) { return i % 9; }
  function boxOf(i) { return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3); }

  function peers(i) {
    const r = rowOf(i), c = colOf(i), b = boxOf(i);
    const set = new Set();
    for (let k = 0; k < 9; k++) {
      set.add(idx(r, k));
      set.add(idx(k, c));
      const br = Math.floor(b / 3) * 3 + Math.floor(k / 3);
      const bc = (b % 3) * 3 + (k % 3);
      set.add(idx(br, bc));
    }
    set.delete(i);
    return set;
  }

  // Precomputed peers
  const PEERS = Array.from({ length: 81 }, (_, i) => Array.from(peers(i)));

  function valid(grid, i, n) {
    for (const p of PEERS[i]) if (grid[p] === n) return false;
    return true;
  }

  // Solve with backtracking. Returns true if solved, and stops after `limit` solutions.
  function countSolutions(grid, limit = 2) {
    const g = grid.slice();
    let count = 0;
    function go() {
      let best = -1, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i] === 0) {
          let cand = 0;
          for (let n = 1; n <= 9; n++) if (valid(g, i, n)) cand++;
          if (cand < bestCount) { bestCount = cand; best = i; if (cand <= 1) break; }
        }
      }
      if (best === -1) { count++; return count >= limit; }
      for (let n = 1; n <= 9; n++) {
        if (valid(g, best, n)) {
          g[best] = n;
          if (go()) return true;
          g[best] = 0;
        }
      }
      return false;
    }
    go();
    return count;
  }

  function solve(grid) {
    const g = grid.slice();
    function go() {
      let best = -1, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i] === 0) {
          let cand = 0;
          for (let n = 1; n <= 9; n++) if (valid(g, i, n)) cand++;
          if (cand < bestCount) { bestCount = cand; best = i; if (cand <= 1) break; }
        }
      }
      if (best === -1) return true;
      for (let n = 1; n <= 9; n++) {
        if (valid(g, best, n)) {
          g[best] = n;
          if (go()) return true;
          g[best] = 0;
        }
      }
      return false;
    }
    go();
    return g;
  }

  // Generate a filled grid by randomized backtracking
  function filled(rand) {
    const g = new Array(81).fill(0);
    function go() {
      let best = -1, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i] === 0) {
          let cand = 0;
          for (let n = 1; n <= 9; n++) if (valid(g, i, n)) cand++;
          if (cand < bestCount) { bestCount = cand; best = i; if (cand <= 1) break; }
        }
      }
      if (best === -1) return true;
      const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand);
      for (const n of nums) {
        if (valid(g, best, n)) {
          g[best] = n;
          if (go()) return true;
          g[best] = 0;
        }
      }
      return false;
    }
    go();
    return g;
  }

  // Dig holes while maintaining uniqueness. targetClues roughly calibrates difficulty.
  function generate(difficulty = 'medium', seed = Date.now() & 0xffffffff) {
    const rand = mulberry32(seed);
    const solution = filled(rand);
    const puzzle = solution.slice();
    const targetClues = {
      beginner: 45,
      easy: 38,
      medium: 32,
      hard: 28,
      master: 24,
    }[difficulty] || 32;
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i), rand);
    let clues = 81;
    for (const i of order) {
      if (clues <= targetClues) break;
      if (puzzle[i] === 0) continue;
      const backup = puzzle[i];
      puzzle[i] = 0;
      // Uniqueness check
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[i] = backup;
      } else {
        clues--;
      }
    }
    return { puzzle, solution };
  }

  // For perf/demo: three hand-built puzzles per difficulty. Generating at load is slower on hard levels.
  const CANNED = {
    beginner: [
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
    ],
    easy: [
      "020608000580009700000040000370000500600000004008000013000020000009800036000306090",
    ],
    medium: [
      "100920000524010000000000070050008102000000000402700090060000000000030945000071006",
    ],
    hard: [
      "004005300009030060580690002006000050000000000020000800300074086040020700005800100",
    ],
    master: [
      "800000000003600000070090200050007000000045700000100030001000068008500010090000400",
    ],
  };

  function fromString(s) {
    return s.split('').map((c) => (c === '.' || c === '0') ? 0 : parseInt(c, 10));
  }

  function canned(difficulty) {
    const list = CANNED[difficulty] || CANNED.medium;
    const puzzle = fromString(list[Math.floor(Math.random() * list.length)]);
    const solution = solve(puzzle);
    return { puzzle, solution };
  }

  // Conflict detection for current grid state — returns a Set of indices that conflict.
  function conflicts(grid) {
    const bad = new Set();
    for (let i = 0; i < 81; i++) {
      const v = grid[i];
      if (!v) continue;
      for (const p of PEERS[i]) {
        if (grid[p] === v) { bad.add(i); bad.add(p); }
      }
    }
    return bad;
  }

  // Which cells are highlighted for a given selection?
  function relatedCells(selected) {
    if (selected == null || selected < 0) return new Set();
    return new Set([selected, ...PEERS[selected]]);
  }

  // Count of each digit remaining (9 entries, 1..9). Based on how many of each appear in grid.
  function digitCounts(grid) {
    const c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const v of grid) if (v) c[v - 1]++;
    return c;
  }

  // Check whether a row/col/box is fully & correctly filled.
  function unitComplete(grid, solution) {
    // returns which units became newly complete — useful for pulse animations
    // (caller compares to previous)
    const units = { rows: [], cols: [], boxes: [] };
    for (let k = 0; k < 9; k++) {
      let okR = true, okC = true, okB = true;
      for (let j = 0; j < 9; j++) {
        if (grid[idx(k, j)] !== solution[idx(k, j)]) okR = false;
        if (grid[idx(j, k)] !== solution[idx(j, k)]) okC = false;
        const br = Math.floor(k / 3) * 3 + Math.floor(j / 3);
        const bc = (k % 3) * 3 + (j % 3);
        if (grid[idx(br, bc)] !== solution[idx(br, bc)]) okB = false;
      }
      if (okR) units.rows.push(k);
      if (okC) units.cols.push(k);
      if (okB) units.boxes.push(k);
    }
    return units;
  }

  function isComplete(grid, solution) {
    for (let i = 0; i < 81; i++) if (grid[i] !== solution[i]) return false;
    return true;
  }

  window.Sudoku = {
    generate, canned, fromString, solve, conflicts, relatedCells,
    digitCounts, unitComplete, isComplete, PEERS,
    idx, rowOf, colOf, boxOf,
  };
})();
