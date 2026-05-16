import { useEffect } from 'react';
import { useGameStore } from '../../store';
import { useRaceStore } from '../../store/raceStore';
import { useNavigation } from '../../hooks/useNavigation';
import type { RaceClient, RaceMessage } from '../../lib/race';
import { BOARD_SIZE } from '../../core/constants';

const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE; // 81

/** Sits above the board during a race. Shows opponent progress bars +
 * pipes our own placement events to the WS server.
 *
 * The WS client is held on `window.__raceClient` so RaceLobbyScreen
 * can hand it off without React-context plumbing. The component
 * grabs it on mount, attaches a listener, and cleans up on unmount. */
export function RaceOpponentBar() {
  const { go } = useNavigation();
  const myUserId = useRaceStore((s) => s.myUserId);
  const participants = useRaceStore((s) => s.participants);
  const phase = useRaceStore((s) => s.phase);
  const board = useGameStore((s) => s.board);
  const status = useGameStore((s) => s.status);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const mistakes = useGameStore((s) => s.mistakes);

  const client: RaceClient | null = (window as any).__raceClient ?? null;

  // Subscribe to incoming race messages.
  useEffect(() => {
    if (!client) return;
    const off = client.on((msg: RaceMessage) => {
      const r = useRaceStore.getState();
      if (msg.type === 'progressUpdate') {
        r.applyProgress(msg.userId, msg.progress, msg.mistakes);
      } else if (msg.type === 'finished') {
        r.applyFinish(msg.userId, msg.rank, msg.timeSeconds, msg.mistakes);
      } else if (msg.type === 'matchOver') {
        r.updateParticipants(msg.ranking);
        r.setPhase('over');
        // Bounce to the results screen via a tiny delay so the win
        // modal (if mine just fired) gets a frame to render first.
        setTimeout(() => go('raceResults'), 600);
      } else if (msg.type === 'participantLeft') {
        r.updateParticipants(msg.participants);
      }
    });
    return off;
  }, [client, go]);

  // Emit progress on every board change while racing.
  useEffect(() => {
    if (!client || phase !== 'racing') return;
    let filled = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) if (board[r][c] != null) filled++;
    }
    client.send({ type: 'progress', cellsFilled: filled, mistakes });
  }, [client, phase, board, mistakes]);

  // When local game enters 'won', send 'finish' once.
  useEffect(() => {
    if (!client || phase !== 'racing' || status !== 'won') return;
    client.send({
      type: 'finish',
      timeSeconds: elapsed,
      mistakes,
    });
  }, [client, phase, status, elapsed, mistakes]);

  // No race? Render nothing — keeps GameScreen layout untouched in solo mode.
  if (!myUserId || participants.length < 2) return null;

  const opponents = participants.filter((p) => p.userId !== myUserId);

  return (
    <div className="w-full max-w-[min(96vw,560px)] space-y-1 px-1">
      {opponents.map((p) => {
        const pct = Math.min(100, Math.round((p.progress / TOTAL_CELLS) * 100));
        const finished = p.finishRank != null;
        return (
          <div key={p.userId} className="bg-bg-elevated rounded-md px-3 py-2 border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{p.name}</span>
              <span className={finished ? 'text-win' : 'text-fg-muted'}>
                {finished
                  ? `Finished #${p.finishRank} (${p.finishTimeSeconds}s)`
                  : `${pct}% · ${p.mistakes} mistakes`}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-bg-sunken rounded overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${finished ? 'bg-win' : 'bg-accent'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
