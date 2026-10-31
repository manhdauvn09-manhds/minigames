/**
 * Real-time multiplayer for Kaya/Caro (Gomoku, five-in-a-row).
 * Server-authoritative: validates every move, runs matchmaking, syncs both clients.
 *
 * Attach to an existing http.Server:   attachMultiplayer(server)
 * Client connects to:                  wss://host/ws
 *
 * Wire protocol (JSON text frames). Client → server:
 *   {t:'hello', name, userId}      register display name
 *   {t:'queue'}                    enter matchmaking
 *   {t:'cancel'}                   leave the queue
 *   {t:'move', x, y}               place a stone (only on your turn)
 *   {t:'rematch'}                  ask for a rematch (both must agree)
 *   {t:'leave'}                    leave the current room
 *   {t:'ping'}                     keepalive
 * Server → client:
 *   {t:'welcome', id, online}
 *   {t:'queued'} / {t:'cancelled'}
 *   {t:'start', room, color, you, opponent, size, yourTurn}
 *   {t:'move', x, y, color, nextTurn}
 *   {t:'over', result, winner, line}
 *   {t:'rematch_wait'} / {t:'opp_left'}
 *   {t:'online', n}                periodic online count
 *   {t:'pong'} / {t:'error', msg}
 */
import { WebSocketServer } from 'ws';

const SIZE = 15;            // 15×15 board
const WIN = 5;              // five in a row
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

let _seq = 0;
const conns = new Map();    // id → conn
let queue = [];             // ids waiting for a match
const rooms = new Map();    // roomId → room

function send(conn, obj) {
  if (conn && conn.ws.readyState === 1) {
    try { conn.ws.send(JSON.stringify(obj)); } catch { /* ignore */ }
  }
}

function broadcastOnline() {
  const n = conns.size;
  for (const c of conns.values()) send(c, { t: 'online', n });
}

function newRoom(a, b) {
  const id = 'r' + (++_seq).toString(36) + Date.now().toString(36);
  // a = black (moves first), b = white
  const board = Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
  const room = { id, players: [a, b], board, turn: 'B', over: false, rematch: new Set() };
  rooms.set(id, room);
  a.room = id; a.color = 'B';
  b.room = id; b.color = 'W';
  const meta = (self, opp, yourTurn) => ({
    t: 'start', room: id, color: self.color,
    you: self.name, opponent: opp.name, size: SIZE, yourTurn,
  });
  send(a, meta(a, b, true));
  send(b, meta(b, a, false));
  return room;
}

function tryMatch() {
  while (queue.length >= 2) {
    const aId = queue.shift(), bId = queue.shift();
    const a = conns.get(aId), b = conns.get(bId);
    if (!a || a.ws.readyState !== 1) { if (b) queue.unshift(bId); continue; }
    if (!b || b.ws.readyState !== 1) { if (a) queue.unshift(aId); continue; }
    newRoom(a, b);
  }
}

/** Returns the winning line (array of [x,y]) if placing `color` at (x,y) makes WIN-in-a-row, else null. */
function winningLine(board, x, y, color) {
  for (const [dx, dy] of DIRS) {
    const line = [[x, y]];
    for (let s = 1; s < WIN; s++) {
      const nx = x + dx * s, ny = y + dy * s;
      if (board[ny]?.[nx] === color) line.push([nx, ny]); else break;
    }
    for (let s = 1; s < WIN; s++) {
      const nx = x - dx * s, ny = y - dy * s;
      if (board[ny]?.[nx] === color) line.unshift([nx, ny]); else break;
    }
    if (line.length >= WIN) return line;
  }
  return null;
}

function boardFull(board) {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (!board[y][x]) return false;
  return true;
}

function opponentOf(room, conn) {
  return room.players.find(p => p && p.id !== conn.id);
}

function endRoom(room) {
  if (!room) return;
  rooms.delete(room.id);
  room.players.forEach(p => { if (p) { p.room = null; p.color = null; } });
}

function handleMove(conn, x, y) {
  const room = rooms.get(conn.room);
  if (!room || room.over) return;
  x = x | 0; y = y | 0;
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return send(conn, { t: 'error', msg: 'oob' });
  if (room.turn !== conn.color) return send(conn, { t: 'error', msg: 'not_your_turn' });
  if (room.board[y][x]) return send(conn, { t: 'error', msg: 'occupied' });

  room.board[y][x] = conn.color;
  const line = winningLine(room.board, x, y, conn.color);
  const next = conn.color === 'B' ? 'W' : 'B';
  room.turn = next;

  const opp = opponentOf(room, conn);
  for (const p of [conn, opp]) send(p, { t: 'move', x, y, color: conn.color, nextTurn: next });

  if (line) {
    room.over = true;
    send(conn, { t: 'over', result: 'win', winner: conn.color, line });
    send(opp,  { t: 'over', result: 'lose', winner: conn.color, line });
  } else if (boardFull(room.board)) {
    room.over = true;
    for (const p of [conn, opp]) send(p, { t: 'over', result: 'draw', winner: null, line: null });
  }
}

function handleRematch(conn) {
  const room = rooms.get(conn.room);
  if (!room || !room.over) return;
  room.rematch.add(conn.id);
  const opp = opponentOf(room, conn);
  if (opp && room.rematch.has(opp.id)) {
    // both agreed → swap colors, fresh board
    endRoom(room);
    newRoom(opp, conn);   // previous white starts as black this time
  } else {
    send(conn, { t: 'rematch_wait' });
    send(opp, { t: 'error', msg: 'opp_wants_rematch' });
  }
}

function dropFromQueue(id) { queue = queue.filter(q => q !== id); }

function handleClose(conn) {
  conns.delete(conn.id);
  dropFromQueue(conn.id);
  const room = rooms.get(conn.room);
  if (room) {
    const opp = opponentOf(room, conn);
    if (opp) send(opp, { t: 'opp_left' });
    endRoom(room);
  }
  broadcastOnline();
}

export function attachMultiplayer(server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 });

  wss.on('connection', (ws) => {
    const conn = { id: 'c' + (++_seq).toString(36), ws, name: 'Player', userId: null, room: null, color: null, alive: true };
    conns.set(conn.id, conn);
    send(conn, { t: 'welcome', id: conn.id, online: conns.size });
    broadcastOnline();

    ws.on('pong', () => { conn.alive = true; });
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw.toString()); } catch { return; }
      switch (m && m.t) {
        case 'hello':
          conn.name = String(m.name || 'Player').slice(0, 24);
          conn.userId = m.userId ? String(m.userId).slice(0, 64) : null;
          break;
        case 'queue':
          if (conn.room || queue.includes(conn.id)) return;
          queue.push(conn.id); send(conn, { t: 'queued' }); tryMatch();
          break;
        case 'cancel':
          dropFromQueue(conn.id); send(conn, { t: 'cancelled' });
          break;
        case 'move':   handleMove(conn, m.x, m.y); break;
        case 'rematch': handleRematch(conn); break;
        case 'leave': {
          const room = rooms.get(conn.room);
          if (room) { const opp = opponentOf(room, conn); if (opp) send(opp, { t: 'opp_left' }); endRoom(room); }
          dropFromQueue(conn.id);
          break;
        }
        case 'ping': send(conn, { t: 'pong' }); break;
      }
    });
    ws.on('close', () => handleClose(conn));
    ws.on('error', () => handleClose(conn));
  });

  // Keepalive: terminate sockets that stop answering pings.
  const interval = setInterval(() => {
    for (const c of conns.values()) {
      if (!c.alive) { try { c.ws.terminate(); } catch {} continue; }
      c.alive = false; try { c.ws.ping(); } catch {}
    }
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  console.log('[minigames] multiplayer WebSocket attached at /ws');
  return wss;
}
