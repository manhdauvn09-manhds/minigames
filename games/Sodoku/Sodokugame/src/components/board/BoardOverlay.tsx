import { useGameStore } from '../../store';
import { useStrings } from '../../hooks/useStrings';
import { Button } from '../ui/Button';

/** Covers the board for paused state (and any future "preview"
 * affordance). Win + Lost are full-screen Modals (separate). */
export function BoardOverlay() {
  const status = useGameStore((s) => s.status);
  const t = useStrings();

  if (status !== 'paused') return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/85 backdrop-blur-sm rounded-md">
      <div className="text-center space-y-4">
        <p className="font-serif text-3xl">{t.game.pause}</p>
        <Button variant="primary" size="lg" onClick={() => useGameStore.getState().resume()}>
          {t.game.resume}
        </Button>
      </div>
    </div>
  );
}
