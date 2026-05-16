import { Cell } from './Cell';
import { BOARD_SIZE } from '../../core/constants';

export function Board() {
  return (
    <div
      className="
        grid grid-cols-9 grid-rows-9 gap-0
        w-full max-w-[min(96vw,560px)] aspect-square
        bg-bg-elevated rounded-md shadow-board overflow-hidden
        border-2 border-fg-subtle
      "
      role="grid"
      aria-label="Sudoku board"
    >
      {Array.from({ length: BOARD_SIZE }).map((_, r) =>
        Array.from({ length: BOARD_SIZE }).map((_, c) => (
          <Cell key={r * BOARD_SIZE + c} row={r} col={c} />
        )),
      )}
    </div>
  );
}
