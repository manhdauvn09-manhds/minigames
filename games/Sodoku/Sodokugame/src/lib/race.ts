// Race WebSocket client. Wraps `WebSocket` with typed send + a small
// observer registry so screens can subscribe to specific message
// types without touching raw events.
//
// Server protocol lives in `server/app/sudoku/race.py`. Keep this file
// in sync if message shapes change there.

export interface Participant {
  userId: string;
  name: string;
  ready: boolean;
  progress: number;          // cells filled (0..81)
  mistakes: number;
  finishRank: number | null;
  finishTimeSeconds: number | null;
}

export type RaceMessage =
  | { type: 'created';            roomCode: string; seed: string; level: number;
                                   you: { userId: string; name: string };
                                   participants: Participant[] }
  | { type: 'joined';             roomCode: string; seed: string; level: number;
                                   you: { userId: string; name: string };
                                   participants: Participant[] }
  | { type: 'participantJoined';  participants: Participant[] }
  | { type: 'participantLeft';    userId: string; participants: Participant[] }
  | { type: 'participantUpdate';  participants: Participant[] }
  | { type: 'started' }
  | { type: 'progressUpdate';     userId: string; progress: number; mistakes: number }
  | { type: 'finished';           userId: string; name: string; rank: number;
                                   timeSeconds: number; mistakes: number }
  | { type: 'matchOver';          ranking: Participant[] }
  | { type: 'error';              message: string };

type Listener = (msg: RaceMessage) => void;

export class RaceClient {
  private ws: WebSocket | null = null;
  private listeners: Listener[] = [];
  private closeListeners: Array<(ev: CloseEvent) => void> = [];

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
      } catch (e) {
        reject(e);
        return;
      }
      this.ws.onopen = () => resolve();
      this.ws.onerror = (ev) => reject(new Error('WebSocket error: ' + String(ev)));
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as RaceMessage;
          for (const l of this.listeners) l(msg);
        } catch {
          /* ignore malformed frames */
        }
      };
      this.ws.onclose = (ev) => {
        for (const l of this.closeListeners) l(ev);
      };
    });
  }

  on(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  onClose(fn: (ev: CloseEvent) => void): () => void {
    this.closeListeners.push(fn);
    return () => {
      this.closeListeners = this.closeListeners.filter((l) => l !== fn);
    };
  }

  send(msg: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    try { this.ws?.close(); } catch { /* noop */ }
    this.ws = null;
    this.listeners = [];
    this.closeListeners = [];
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

/** Build the WebSocket URL for the race endpoint.
 *
 * Default points at the SodokuBackend service which fronts the FastAPI
 * race router. After the AllIn1Site split (2026-04-27) the FE and the
 * race backend share the same subdomain — nginx routes /api/sudoku/*
 * on sodoku.allin1site.com to the backend container. ENV override
 * `VITE_RACE_WS_URL` for staging / dev. */
export function defaultRaceUrl(): string {
  const env = (import.meta as any).env?.VITE_RACE_WS_URL as string | undefined;
  if (env) return env;
  return 'wss://sodoku.allin1site.com/api/sudoku/ws/race';
}
