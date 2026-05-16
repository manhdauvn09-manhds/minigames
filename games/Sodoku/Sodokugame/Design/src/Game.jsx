/* Game.jsx — the active puzzle screen with full state management. */
(function () {
  'use strict';

  const { useState, useEffect, useMemo, useRef, useCallback } = React;
  const Icon = window.Icon;
  const Board = window.Board;

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function GameScreen({ level, onExit, onWin, settings }) {
    // Initialize puzzle once
    const [puzzleData] = useState(() => window.Sudoku.canned(level));
    const [grid, setGrid] = useState(() => puzzleData.puzzle.slice());
    const givens = useMemo(() => puzzleData.puzzle.map((v) => v !== 0), [puzzleData]);
    const [notes, setNotes] = useState(() => Array.from({ length: 81 }, () => new Set()));
    const [selected, setSelected] = useState(40); // center cell by default
    const [noteMode, setNoteMode] = useState(false);
    const [mistakes, setMistakes] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [hintsAvailable, setHintsAvailable] = useState(3);
    const [seconds, setSeconds] = useState(0);
    const [paused, setPaused] = useState(false);
    const [history, setHistory] = useState([]);
    const [flashCells, setFlashCells] = useState(new Set());
    const [spotlightCells, setSpotlightCells] = useState(new Set());
    const [hintTip, setHintTip] = useState(null);
    const [rippling, setRippling] = useState(false);

    // Timer
    useEffect(() => {
      if (paused) return;
      const id = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(id);
    }, [paused]);

    // Keyboard
    useEffect(() => {
      function onKey(e) {
        if (e.key >= '1' && e.key <= '9') handleNumber(parseInt(e.key, 10));
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handleErase();
        else if (e.key === 'n' || e.key === 'N') setNoteMode((m) => !m);
        else if (e.key === 'ArrowUp' && selected >= 9) setSelected(selected - 9);
        else if (e.key === 'ArrowDown' && selected < 72) setSelected(selected + 9);
        else if (e.key === 'ArrowLeft' && selected % 9 !== 0) setSelected(selected - 1);
        else if (e.key === 'ArrowRight' && selected % 9 !== 8) setSelected(selected + 1);
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    });

    const conflicts = useMemo(() => window.Sudoku.conflicts(grid), [grid]);
    const digitCounts = useMemo(() => window.Sudoku.digitCounts(grid), [grid]);

    function pushHistory() {
      setHistory((h) => [...h.slice(-29), {
        grid: grid.slice(),
        notes: notes.map((s) => new Set(s)),
        mistakes, hintsUsed,
      }]);
    }

    function handleNumber(n) {
      if (selected == null || givens[selected]) return;
      pushHistory();
      if (noteMode) {
        setNotes((ns) => {
          const copy = ns.map((s) => new Set(s));
          if (grid[selected] === 0) {
            if (copy[selected].has(n)) copy[selected].delete(n);
            else copy[selected].add(n);
          }
          return copy;
        });
        return;
      }
      const newGrid = grid.slice();
      newGrid[selected] = n;
      setGrid(newGrid);
      // Clear notes in this cell
      setNotes((ns) => {
        const copy = ns.map((s) => new Set(s));
        copy[selected] = new Set();
        return copy;
      });
      // Count mistake if wrong
      if (n !== puzzleData.solution[selected]) {
        setMistakes((m) => m + 1);
      } else {
        // Check completed units — flash them
        const newlyComplete = findNewlyCompleted(grid, newGrid, puzzleData.solution);
        if (newlyComplete.size > 0) {
          setFlashCells(newlyComplete);
          setTimeout(() => setFlashCells(new Set()), 650);
        }
      }
      // Check win
      if (window.Sudoku.isComplete(newGrid, puzzleData.solution)) {
        setRippling(true);
        setTimeout(() => {
          onWin({
            level,
            time: formatTime(seconds),
            mistakes,
            hints: hintsUsed,
            best: seconds < 10 * 60,
            badge: mistakes === 0 ? 'Flawless' : null,
          });
        }, 900);
      }
    }

    function handleErase() {
      if (selected == null || givens[selected]) return;
      if (grid[selected] === 0 && (!notes[selected] || notes[selected].size === 0)) return;
      pushHistory();
      const newGrid = grid.slice();
      newGrid[selected] = 0;
      setGrid(newGrid);
      setNotes((ns) => {
        const copy = ns.map((s) => new Set(s));
        copy[selected] = new Set();
        return copy;
      });
    }

    function handleUndo() {
      if (history.length === 0) return;
      const last = history[history.length - 1];
      setGrid(last.grid);
      setNotes(last.notes);
      setMistakes(last.mistakes);
      setHintsUsed(last.hintsUsed);
      setHistory((h) => h.slice(0, -1));
    }

    function handleHint() {
      if (hintsAvailable <= 0 || selected == null || givens[selected]) return;
      const correct = puzzleData.solution[selected];
      // Spotlight the cell and show tooltip
      setSpotlightCells(new Set([selected]));
      setHintTip({ cell: selected, n: correct, technique: pickTechnique() });
      setTimeout(() => {
        setSpotlightCells(new Set());
        setHintTip(null);
        pushHistory();
        const newGrid = grid.slice();
        newGrid[selected] = correct;
        setGrid(newGrid);
        setHintsUsed((h) => h + 1);
        setHintsAvailable((h) => h - 1);
      }, 1800);
    }

    function findNewlyCompleted(oldGrid, newGrid, solution) {
      const newlyComplete = new Set();
      const oldUnits = window.Sudoku.unitComplete(oldGrid, solution);
      const newUnits = window.Sudoku.unitComplete(newGrid, solution);
      // Rows
      for (const r of newUnits.rows) {
        if (!oldUnits.rows.includes(r)) {
          for (let c = 0; c < 9; c++) newlyComplete.add(r * 9 + c);
        }
      }
      for (const c of newUnits.cols) {
        if (!oldUnits.cols.includes(c)) {
          for (let r = 0; r < 9; r++) newlyComplete.add(r * 9 + c);
        }
      }
      for (const b of newUnits.boxes) {
        if (!oldUnits.boxes.includes(b)) {
          const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) newlyComplete.add((br + i) * 9 + bc + j);
        }
      }
      return newlyComplete;
    }

    function pickTechnique() {
      return ['Naked single', 'Hidden single', 'Pointing pair', 'Locked candidate'][Math.floor(Math.random() * 4)];
    }

    const L = window.LEVEL_BY_ID[level];

    return (
      <div className="screen">
        <div className="topbar">
          <div className="side">
            <button className="icon-btn" aria-label="Back" onClick={onExit}>
              <Icon.ArrowLeft />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{L.name}</span>
          </div>
          <div className="center">
            <div className="level-name">{L.kanji}</div>
            <div className="timer">{formatTime(seconds)}</div>
          </div>
          <div className="side right">
            {settings.mistakeLimit && (
              <div className={`mistakes ${mistakes >= 3 ? 'over' : ''}`}>
                {mistakes}/3
              </div>
            )}
            <button className="icon-btn" aria-label={paused ? 'Resume' : 'Pause'} onClick={() => setPaused((p) => !p)}>
              {paused ? <Icon.Play /> : <Icon.Pause />}
            </button>
          </div>
        </div>

        <div className="board-wrap" style={{ position: 'relative' }}>
          {hintTip && (
            <div className="hint-tooltip" style={{
              left: '50%', top: '30%',
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
            }}>
              {hintTip.technique} · try {hintTip.n}
            </div>
          )}
          <Board
            grid={grid}
            givens={givens}
            notes={notes}
            selected={selected}
            onSelect={setSelected}
            conflicts={conflicts}
            flashCells={flashCells}
            spotlightCells={spotlightCells}
            className={rippling ? 'ripple' : ''}
          />
        </div>

        <div className="numpad">
          {[1,2,3,4,5,6,7,8,9].map((n) => {
            const remaining = 9 - digitCounts[n - 1];
            return (
              <button
                key={n}
                disabled={remaining <= 0 && !noteMode}
                onClick={() => handleNumber(n)}
              >
                {n}
                <span className="remaining">{remaining > 0 ? remaining : '✓'}</span>
              </button>
            );
          })}
        </div>

        <div className="action-row">
          <button className="action" onClick={handleUndo} disabled={history.length === 0}>
            <Icon.Undo size={22} />
            Undo
          </button>
          <button className="action" onClick={handleErase}>
            <Icon.Eraser size={22} />
            Erase
          </button>
          <button className={`action ${noteMode ? 'on' : ''}`} onClick={() => setNoteMode((m) => !m)}>
            <Icon.Pencil size={22} />
            Notes
            {noteMode && <span className="indicator-dot" />}
          </button>
          <button className="action" onClick={handleHint} disabled={hintsAvailable === 0}>
            <Icon.Lightbulb size={22} />
            Hint
            {hintsAvailable > 0 && <span className="badge">{hintsAvailable}</span>}
          </button>
        </div>
      </div>
    );
  }

  window.GameScreen = GameScreen;
})();
