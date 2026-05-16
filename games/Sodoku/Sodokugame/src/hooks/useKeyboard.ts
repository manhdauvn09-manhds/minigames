import { useEffect } from 'react';
import { useGameStore } from '../store';
import { BOARD_SIZE } from '../core/constants';

/** Wires keyboard shortcuts for the game screen.
 *   1-9              place value (or note if pencil mode)
 *   0 / Backspace    erase
 *   N                toggle pencil mode
 *   H                request hint (caller passes onHint to dispatch)
 *   Space            toggle pause
 *   Ctrl+Z / Cmd+Z   undo
 *   Ctrl+Shift+Z     redo
 *   Arrow keys       move selection within the 9×9 grid
 *
 * Guards on input focus so typing in a setting field doesn't trigger
 * board actions.
 */
export function useKeyboard(opts: { onHint?: () => void } = {}): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const t = document.activeElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      const s = useGameStore.getState();

      // Numeric keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        s.placeValue(Number(e.key));
        e.preventDefault();
        return;
      }
      if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        s.erase();
        e.preventDefault();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        s.togglePencilMode();
        e.preventDefault();
        return;
      }
      if (e.key === ' ') {
        if (s.status === 'paused') s.resume(); else s.pause();
        e.preventDefault();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        opts.onHint?.();
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) s.redo(); else s.undo();
        e.preventDefault();
        return;
      }
      if (e.key.startsWith('Arrow')) {
        const cur = s.selectedCell ?? { row: 0, col: 0 };
        let r = cur.row, c = cur.col;
        if (e.key === 'ArrowUp') r = (r + BOARD_SIZE - 1) % BOARD_SIZE;
        else if (e.key === 'ArrowDown') r = (r + 1) % BOARD_SIZE;
        else if (e.key === 'ArrowLeft') c = (c + BOARD_SIZE - 1) % BOARD_SIZE;
        else if (e.key === 'ArrowRight') c = (c + 1) % BOARD_SIZE;
        s.selectCell({ row: r, col: c });
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts.onHint]);
}
