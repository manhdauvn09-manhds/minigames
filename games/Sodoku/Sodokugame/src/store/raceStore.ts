// Race state — separate from gameStore because the lifecycle is
// different (lobby → race → over) and most of it doesn't need to
// persist. The puzzle play itself still goes through gameStore once
// the race starts; raceStore only owns the lobby + opponent presence.

import { create } from 'zustand';
import type { Participant } from '../lib/race';
import type { DifficultyLevel } from '../core/types';

export type RacePhase = 'idle' | 'connecting' | 'lobby' | 'racing' | 'over';

interface RaceState {
  phase: RacePhase;
  /** Server-issued — share with the other player so they can join. */
  roomCode: string | null;
  /** Engine seed; both clients run `engine.generate(level, seed)`
   * locally so the puzzle is identical without sending the board. */
  seed: string | null;
  level: DifficultyLevel | null;
  /** Server-assigned id for THIS client. */
  myUserId: string | null;
  participants: Participant[];
  errorMsg: string | null;

  setPhase: (p: RacePhase) => void;
  setError: (msg: string | null) => void;
  setRoomInfo: (roomCode: string, seed: string, level: number, myUserId: string) => void;
  updateParticipants: (ps: Participant[]) => void;
  applyProgress: (userId: string, progress: number, mistakes: number) => void;
  applyFinish: (userId: string, rank: number, timeSeconds: number, mistakes: number) => void;
  reset: () => void;
}

const EMPTY = {
  phase: 'idle' as RacePhase,
  roomCode: null,
  seed: null,
  level: null,
  myUserId: null,
  participants: [] as Participant[],
  errorMsg: null,
};

export const useRaceStore = create<RaceState>((set) => ({
  ...EMPTY,

  setPhase: (phase) => set({ phase }),
  setError: (errorMsg) => set({ errorMsg }),
  setRoomInfo: (roomCode, seed, level, myUserId) =>
    set({ roomCode, seed, level: level as DifficultyLevel, myUserId }),
  updateParticipants: (participants) => set({ participants }),

  applyProgress: (userId, progress, mistakes) =>
    set((s) => ({
      participants: s.participants.map((p) =>
        p.userId === userId ? { ...p, progress, mistakes } : p,
      ),
    })),

  applyFinish: (userId, rank, timeSeconds, mistakes) =>
    set((s) => ({
      participants: s.participants.map((p) =>
        p.userId === userId
          ? { ...p, finishRank: rank, finishTimeSeconds: timeSeconds, mistakes }
          : p,
      ),
    })),

  reset: () => set(EMPTY),
}));
