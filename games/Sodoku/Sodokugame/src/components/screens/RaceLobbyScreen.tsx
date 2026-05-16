import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../../hooks/useNavigation';
import { useEngine } from '../../hooks/useEngine';
import { useRaceStore } from '../../store/raceStore';
import { useGameStore } from '../../store';
import { RaceClient, defaultRaceUrl } from '../../lib/race';
import { Button } from '../ui/Button';
import { ChevronLeft, Copy, Users } from 'lucide-react';
import type { DifficultyLevel } from '../../core/types';

/** Lobby — sits between HomeScreen "Multiplayer" click and the actual
 * race. Owns the WebSocket lifetime; passes the live RaceClient to
 * RaceGameScreen via a window-scoped singleton. */
export function RaceLobbyScreen() {
  const { go } = useNavigation();
  const engine = useEngine();
  const phase = useRaceStore((s) => s.phase);
  const errorMsg = useRaceStore((s) => s.errorMsg);
  const roomCode = useRaceStore((s) => s.roomCode);
  const seed = useRaceStore((s) => s.seed);
  const level = useRaceStore((s) => s.level);
  const myUserId = useRaceStore((s) => s.myUserId);
  const participants = useRaceStore((s) => s.participants);

  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [chosenLevel, setChosenLevel] = useState<DifficultyLevel>(3);
  const clientRef = useRef<RaceClient | null>(null);

  useEffect(() => {
    return () => {
      // Tear down the WebSocket if the user backs out of the lobby
      // before the race actually starts. RaceGameScreen takes ownership
      // when phase transitions to 'racing'.
      if (phase !== 'racing') {
        clientRef.current?.close();
        clientRef.current = null;
        useRaceStore.getState().reset();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMessage(): (msg: any) => void {
    return (msg) => {
      const r = useRaceStore.getState();
      if (msg.type === 'created' || msg.type === 'joined') {
        r.setRoomInfo(msg.roomCode, msg.seed, msg.level, msg.you.userId);
        r.updateParticipants(msg.participants);
        r.setPhase('lobby');
      } else if (msg.type === 'participantJoined' || msg.type === 'participantUpdate'
              || msg.type === 'participantLeft') {
        r.updateParticipants(msg.participants);
      } else if (msg.type === 'started') {
        startRace();
      } else if (msg.type === 'error') {
        r.setError(msg.message);
        r.setPhase('idle');
      }
    };
  }

  async function startRace(): Promise<void> {
    const r = useRaceStore.getState();
    if (!r.seed || !r.level) return;
    // Generate the puzzle locally from the server-issued seed.
    const puzzle = await engine.generate(r.level, { seed: r.seed });
    useGameStore.getState().loadPuzzle(puzzle, 'race');
    r.setPhase('racing');
    // Stash the WS client so RaceGameScreen can attach progress sender.
    (window as any).__raceClient = clientRef.current;
    go('game');
  }

  async function create(): Promise<void> {
    const trimmed = name.trim() || 'Player';
    useRaceStore.getState().reset();
    useRaceStore.getState().setPhase('connecting');
    const c = new RaceClient(defaultRaceUrl());
    clientRef.current = c;
    try {
      await c.connect();
      c.on(handleMessage());
      c.send({ type: 'create', name: trimmed, level: chosenLevel });
    } catch (e) {
      useRaceStore.getState().setError('Could not connect: ' + String(e));
      useRaceStore.getState().setPhase('idle');
    }
  }

  async function join(): Promise<void> {
    const trimmed = name.trim() || 'Player';
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 8) {
      useRaceStore.getState().setError('Room code must be 8 characters');
      return;
    }
    useRaceStore.getState().reset();
    useRaceStore.getState().setPhase('connecting');
    const c = new RaceClient(defaultRaceUrl());
    clientRef.current = c;
    try {
      await c.connect();
      c.on(handleMessage());
      c.send({ type: 'join', roomCode: code, name: trimmed });
    } catch (e) {
      useRaceStore.getState().setError('Could not connect: ' + String(e));
      useRaceStore.getState().setPhase('idle');
    }
  }

  function ready(): void {
    clientRef.current?.send({ type: 'ready' });
  }

  function leave(): void {
    clientRef.current?.send({ type: 'leave' });
    clientRef.current?.close();
    clientRef.current = null;
    useRaceStore.getState().reset();
    go('home');
  }

  // ── Render ──
  if (phase === 'lobby' && roomCode) {
    const me = participants.find((p) => p.userId === myUserId);
    const others = participants.filter((p) => p.userId !== myUserId);
    return (
      <div className="min-h-screen flex flex-col bg-bg text-fg p-4 gap-4 max-w-md mx-auto w-full">
        <header className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={leave}>
            <ChevronLeft size={18} />
          </Button>
          <h1 className="font-serif text-2xl">Race lobby</h1>
        </header>

        <div className="bg-bg-elevated rounded-lg p-4 space-y-2 text-center">
          <p className="text-fg-subtle text-xs uppercase tracking-widest">Room code</p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-3xl font-mono tracking-widest">{roomCode}</code>
            <Button
              variant="ghost" size="sm"
              onClick={() => navigator.clipboard?.writeText(roomCode)}
              aria-label="Copy code"
            >
              <Copy size={18} />
            </Button>
          </div>
          <p className="text-fg-muted text-xs">
            Share this code with the other player. Level: {level} · seed: {seed?.slice(0, 12)}
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-fg-subtle text-xs uppercase tracking-widest flex items-center gap-1">
            <Users size={14} /> Players ({participants.length}/2)
          </h2>
          {[me, ...others].filter(Boolean).map((p) => (
            <div key={p!.userId}
                 className="flex items-center justify-between bg-bg-elevated rounded-md p-3 border border-border">
              <div>
                <span className="font-medium">{p!.name}</span>
                {p!.userId === myUserId && <span className="text-fg-subtle text-xs"> (you)</span>}
              </div>
              <span className={p!.ready ? 'text-win text-sm' : 'text-fg-subtle text-sm'}>
                {p!.ready ? '✓ Ready' : 'Not ready'}
              </span>
            </div>
          ))}
          {others.length === 0 && (
            <p className="text-fg-subtle text-sm text-center py-2">
              Waiting for the other player to join…
            </p>
          )}
        </div>

        {participants.length === 2 && me && !me.ready && (
          <Button variant="primary" size="lg" onClick={ready}>
            I'm ready
          </Button>
        )}
        {me?.ready && others.some((p) => !p.ready) && (
          <p className="text-fg-muted text-sm text-center">Waiting for opponent to ready up…</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg p-4 gap-4 max-w-md mx-auto w-full">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => go('home')}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="font-serif text-2xl">Multiplayer race</h1>
      </header>

      <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
        <label className="block">
          <span className="text-sm text-fg-muted">Your name</span>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            maxLength={32} placeholder="Player"
            className="mt-1 w-full px-3 py-2 rounded border border-border bg-bg text-fg"
          />
        </label>
      </div>

      <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
        <h2 className="text-fg-subtle text-xs uppercase tracking-widest">Create a room</h2>
        <label className="block">
          <span className="text-sm text-fg-muted">Difficulty</span>
          <select
            value={chosenLevel}
            onChange={(e) => setChosenLevel(Number(e.target.value) as DifficultyLevel)}
            className="mt-1 w-full px-3 py-2 rounded border border-border bg-bg text-fg"
          >
            <option value={1}>Easy</option>
            <option value={2}>Medium</option>
            <option value={3}>Hard</option>
            <option value={4}>Expert</option>
            <option value={5}>Master</option>
          </select>
        </label>
        <Button
          variant="primary" onClick={create}
          disabled={phase === 'connecting'} className="w-full"
        >
          {phase === 'connecting' ? 'Connecting…' : 'Create room'}
        </Button>
      </div>

      <div className="bg-bg-elevated rounded-lg p-4 space-y-3">
        <h2 className="text-fg-subtle text-xs uppercase tracking-widest">Join a room</h2>
        <label className="block">
          <span className="text-sm text-fg-muted">Room code (8 chars)</span>
          <input
            type="text" value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8} placeholder="ABCD2345"
            className="mt-1 w-full px-3 py-2 rounded border border-border bg-bg text-fg uppercase tracking-widest font-mono"
          />
        </label>
        <Button
          variant="secondary" onClick={join}
          disabled={phase === 'connecting' || joinCode.length !== 8} className="w-full"
        >
          Join
        </Button>
      </div>

      {errorMsg && <p className="text-loss text-sm text-center">{errorMsg}</p>}
    </div>
  );
}
