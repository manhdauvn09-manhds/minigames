import { useEffect } from 'react';
import { useGameStore } from '../../store';
import { useStrings } from '../../hooks/useStrings';
import { useNavigation } from '../../hooks/useNavigation';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { audio } from '../../lib/audio';

export function LostModal() {
  const t = useStrings();
  const { go } = useNavigation();
  const status = useGameStore((s) => s.status);

  useEffect(() => {
    if (status === 'lost') audio.play('lose');
  }, [status]);

  return (
    <Modal open={status === 'lost'} dismissable={false} ariaLabel={t.game.lost}>
      <div className="text-center space-y-4">
        <h2 className="font-serif text-2xl text-loss">{t.game.lost}</h2>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button variant="primary" onClick={() => useGameStore.getState().restart()}>
            {t.game.newGame}
          </Button>
          <Button variant="secondary" onClick={() => go('home')}>
            ← Home
          </Button>
        </div>
      </div>
    </Modal>
  );
}
