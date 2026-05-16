/* Board.jsx — the 9x9 Sudoku grid. */
(function () {
  'use strict';

  const { useMemo } = React;

  function Board({
    grid,
    givens,
    notes,
    selected,
    onSelect,
    conflicts,
    flashCells,
    spotlightCells,
    className = '',
  }) {
    const peers = useMemo(() => window.Sudoku.relatedCells(selected), [selected]);
    const selectedValue = selected != null ? grid[selected] : 0;

    const cells = [];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      const v = grid[i];
      const isGiven = givens[i];
      const isSelected = selected === i;
      const isPeer = peers.has(i) && !isSelected;
      const isSame = !isSelected && v !== 0 && v === selectedValue;
      const isConflict = conflicts && conflicts.has(i);
      const isFlash = flashCells && flashCells.has(i);
      const isSpot = spotlightCells && spotlightCells.has(i);
      const hasNotes = !v && notes && notes[i] && notes[i].size > 0;

      const classes = [
        'cell',
        isPeer && 'peer',
        isSame && 'samenum',
        isSelected && 'selected',
        !isGiven && v !== 0 && 'user',
        isConflict && 'conflict',
        isFlash && 'flash-correct',
        isSpot && 'spotlight',
      ].filter(Boolean).join(' ');

      cells.push(
        <div
          key={i}
          className={classes}
          data-row={r}
          data-col={c}
          data-box={b}
          onClick={() => onSelect(i)}
        >
          {v ? (
            <span className={isGiven ? '' : 'num'}>{v}</span>
          ) : hasNotes ? (
            <div className="notes">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span key={n} className={notes[i].has(n) ? 'on' : ''}>{n}</span>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    return <div className={`board ${className}`}>{cells}</div>;
  }

  window.Board = Board;
})();
