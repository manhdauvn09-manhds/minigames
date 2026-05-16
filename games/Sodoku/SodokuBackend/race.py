"""Sodoku multiplayer race — FastAPI WebSocket endpoint + RaceManager.

Phase 7B v1 scope:
  * 2 players per room (capacity hardcoded; PLAN allowed up to 4).
  * In-memory state — no DB. Match dies with the process.
  * Anonymous players: client picks a display name on connect.
  * Race flow:
        host POST 'create' → room created with random 8-char code +
                             random puzzle seed + chosen difficulty
        guest POST 'join'  → joins existing room
        both clients send 'ready' → server broadcasts 'started'
        clients run their own engine.generate(level, seed) → identical
        puzzle on both ends without sending the board over the wire
        clients periodically send 'progress'
        first client to send 'finish' wins; second client gets rank=2
        match auto-cleans 60s after both players finish or 120m total.

Why in-memory: split BE topology has 1 web container hosting all WS
connections; pinning everyone to the same process keeps the
RaceManager simple. Multi-instance scale-out (Phase 7B.5) would
trade this for Redis Pub/Sub.

Origin gate: only accept WS upgrades whose Origin header matches the
allowed Sodoku FE host (env `SODOKU_RACE_ORIGINS`, comma-separated;
default `https://sodoku.allin1site.com`). Same-origin (when the FE
ever moves to allin1site.com proper) also OK.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import secrets
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

logger = logging.getLogger("allin1site.sudoku.race")


# ── Allowlist for the WebSocket Origin header ───────────────────────
def _allowed_origins() -> set[str]:
    raw = os.getenv("SODOKU_RACE_ORIGINS",
                    "https://sodoku.allin1site.com").strip()
    return {o.strip() for o in raw.split(",") if o.strip()}


# ── Config knobs ────────────────────────────────────────────────────
MAX_PLAYERS = 2                # Phase 7B v1
MAX_ROOMS = 256                # in-memory cap
ROOM_TTL_SEC = 7200            # 2h cleanup
PROGRESS_THROTTLE_MS = 200     # min time between client progress msgs
# Sec audit M1: cap concurrent WS connections per IP. With MAX_PLAYERS=2
# a legitimate user opening multiple browser tabs hits at most a few;
# 5 is generous enough for normal use but blocks a single attacker
# from exhausting room slots.
MAX_WS_PER_IP = 5
# Sec audit M1: cap individual WS message size. Race protocol messages
# are tiny (`progress` is ~50 bytes, `finish` ~80 bytes); 4 KiB is
# 50× the largest expected message. Anything larger is malicious.
MAX_WS_MESSAGE_BYTES = 4096


# ── Per-IP connection accounting (M1) ───────────────────────────────
_ip_connections: dict[str, int] = {}
_ip_conn_lock = asyncio.Lock()


async def _ip_acquire(ip: str) -> bool:
    """Increment the counter for `ip` if under the cap. Returns False
    when the cap is hit; caller must close the WS."""
    async with _ip_conn_lock:
        cur = _ip_connections.get(ip, 0)
        if cur >= MAX_WS_PER_IP:
            return False
        _ip_connections[ip] = cur + 1
        return True


async def _ip_release(ip: str) -> None:
    """Decrement the counter; remove the key when it reaches zero so
    the dict doesn't accumulate dead IPs forever."""
    async with _ip_conn_lock:
        cur = _ip_connections.get(ip, 0)
        if cur <= 1:
            _ip_connections.pop(ip, None)
        else:
            _ip_connections[ip] = cur - 1


async def _recv_json_bounded(ws: WebSocket) -> dict:
    """Receive a JSON message and enforce MAX_WS_MESSAGE_BYTES.

    Sec audit M1: previous code used `ws.receive_json()` directly,
    which has no payload-size cap, so a single client could send a
    huge message (`{"type":"progress","cellsFilled":"<MB of garbage>"}`)
    and force the server to allocate / parse it. Using `receive_text()`
    + manual size check + `json.loads()` lets us reject oversize
    payloads without keeping them in memory.
    """
    text = await ws.receive_text()
    if len(text.encode("utf-8")) > MAX_WS_MESSAGE_BYTES:
        raise ValueError(f"message too large: {len(text)} bytes (cap {MAX_WS_MESSAGE_BYTES})")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid JSON: {e}")


# ── Domain ──────────────────────────────────────────────────────────
@dataclass
class Player:
    user_id: str                                # server-assigned uuid-ish
    display_name: str
    ws: WebSocket
    ready: bool = False
    progress: int = 0                           # cells filled (0..81)
    mistakes: int = 0
    finish_time_seconds: int | None = None
    finish_rank: int | None = None
    last_progress_at: float = 0.0


@dataclass
class Room:
    code: str
    seed: str
    level: int
    status: str = "waiting"                     # waiting | active | finished
    players: dict[str, Player] = field(default_factory=dict)
    started_at: float | None = None
    created_at: float = field(default_factory=time.time)
    next_finish_rank: int = 1


def _new_code() -> str:
    # 8 chars, ambiguous chars (0/O, 1/I/l) removed.
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def _new_user_id() -> str:
    return secrets.token_hex(8)


def _new_seed() -> str:
    return f"race-{secrets.token_hex(6)}"


# ── RaceManager ─────────────────────────────────────────────────────
class RaceManager:
    """In-memory room registry. Single instance lives for the process
    lifetime; held by the FastAPI router via module-level singleton."""

    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}
        self._lock = asyncio.Lock()

    async def create(self, *, host_name: str, level: int) -> tuple[Room, Player]:
        async with self._lock:
            await self._gc_expired()
            if len(self._rooms) >= MAX_ROOMS:
                raise RuntimeError("server at room capacity, try again later")
            for _ in range(20):
                code = _new_code()
                if code not in self._rooms:
                    break
            else:
                raise RuntimeError("could not allocate unique room code")
            room = Room(code=code, seed=_new_seed(), level=int(level))
            self._rooms[code] = room
            return room, Player(user_id=_new_user_id(),
                                display_name=host_name, ws=None)  # type: ignore[arg-type]

    async def join(self, code: str, *, name: str) -> tuple[Room, Player]:
        async with self._lock:
            room = self._rooms.get(code)
            if not room:
                raise RuntimeError(f"room {code} not found")
            if room.status != "waiting":
                raise RuntimeError(f"room {code} no longer accepting joins")
            if len(room.players) >= MAX_PLAYERS:
                raise RuntimeError(f"room {code} is full")
            return room, Player(user_id=_new_user_id(),
                                display_name=name, ws=None)  # type: ignore[arg-type]

    async def attach(self, room: Room, player: Player) -> None:
        """Once the WebSocket is open, attach the player. Caller already
        validated through create() / join()."""
        async with self._lock:
            room.players[player.user_id] = player

    async def remove_player(self, room: Room, user_id: str) -> None:
        async with self._lock:
            room.players.pop(user_id, None)
            if not room.players:
                self._rooms.pop(room.code, None)

    async def maybe_start(self, room: Room) -> bool:
        async with self._lock:
            if room.status != "waiting":
                return False
            if len(room.players) < MAX_PLAYERS:
                return False
            if not all(p.ready for p in room.players.values()):
                return False
            room.status = "active"
            room.started_at = time.time()
            return True

    async def record_finish(self, room: Room, player: Player,
                            client_time_seconds: int, mistakes: int) -> int:
        """Returns the rank assigned (1 for first finisher, 2 for second).

        Sec audit M2: previously trusted the client-supplied
        `time_seconds`, letting any client claim a 0-second finish.
        Now derives the elapsed time from the server-side
        `room.started_at` timestamp set by `maybe_start`; the client
        value is accepted only as a fallback when started_at is
        somehow missing (shouldn't happen in normal flow).
        """
        async with self._lock:
            if player.finish_rank is not None:
                return player.finish_rank
            if room.started_at is not None:
                player.finish_time_seconds = max(0, int(time.time() - room.started_at))
            else:
                logger.warning("record_finish: room %s missing started_at, falling back to client time",
                               room.code)
                player.finish_time_seconds = int(client_time_seconds)
            player.mistakes = int(mistakes)
            player.finish_rank = room.next_finish_rank
            room.next_finish_rank += 1
            if all(p.finish_rank is not None for p in room.players.values()):
                room.status = "finished"
            return player.finish_rank

    async def _gc_expired(self) -> None:
        now = time.time()
        expired = [code for code, r in self._rooms.items()
                   if now - r.created_at > ROOM_TTL_SEC]
        for code in expired:
            self._rooms.pop(code, None)
        if expired:
            logger.info("RaceManager GC: dropped %d expired room(s)", expired)


_manager = RaceManager()


# ── Wire-format helpers ─────────────────────────────────────────────
def _participants_payload(room: Room) -> list[dict[str, Any]]:
    return [
        {
            "userId": p.user_id, "name": p.display_name,
            "ready": p.ready, "progress": p.progress, "mistakes": p.mistakes,
            "finishRank": p.finish_rank, "finishTimeSeconds": p.finish_time_seconds,
        }
        for p in room.players.values()
    ]


async def _broadcast(room: Room, payload: dict[str, Any], *, except_uid: str | None = None) -> None:
    dead: list[str] = []
    for p in list(room.players.values()):
        if p.user_id == except_uid:
            continue
        try:
            await p.ws.send_json(payload)
        except Exception:
            dead.append(p.user_id)
    for uid in dead:
        room.players.pop(uid, None)


async def _send(player: Player, payload: dict[str, Any]) -> None:
    try:
        await player.ws.send_json(payload)
    except Exception:
        logger.warning("send to %s failed", player.user_id)


# ── Router ──────────────────────────────────────────────────────────
def build_router() -> APIRouter:
    r = APIRouter(prefix="/api/sudoku", tags=["sudoku"])

    @r.websocket("/ws/race")
    async def ws_race(ws: WebSocket) -> None:
        # Origin gate (browsers send Origin on WS upgrade).
        origin = ws.headers.get("origin", "")
        allowed = _allowed_origins()
        if allowed and origin not in allowed:
            logger.info("rejecting WS race from origin %r", origin)
            await ws.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Sec audit M1: per-IP connection cap. Reject before accept()
        # so we don't even tie up a WS slot for a flooding peer.
        client_ip = ws.client.host if ws.client else "unknown"
        if not await _ip_acquire(client_ip):
            logger.info("rejecting WS race from %s: per-IP cap (%d) reached",
                        client_ip, MAX_WS_PER_IP)
            await ws.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await ws.accept()
        room: Room | None = None
        player: Player | None = None
        try:
            # The first message decides whether this is a host (create)
            # or a guest (join). Bounded wait — drop dead connections.
            try:
                first = await asyncio.wait_for(_recv_json_bounded(ws), timeout=15)
            except asyncio.TimeoutError:
                await ws.close(code=status.WS_1002_PROTOCOL_ERROR)
                return
            except ValueError as e:
                logger.info("rejecting WS race from %s: %s", client_ip, e)
                await ws.close(code=status.WS_1009_MESSAGE_TOO_BIG)
                return

            t = first.get("type")
            if t == "create":
                name = (first.get("name") or "Player").strip()[:32] or "Player"
                level = int(first.get("level") or 3)
                if level < 1 or level > 5:
                    await ws.send_json({"type": "error", "message": "invalid level"})
                    await ws.close(); return
                room, player = await _manager.create(host_name=name, level=level)
                player.ws = ws
                await _manager.attach(room, player)
                await _send(player, {
                    "type": "created",
                    "roomCode": room.code, "seed": room.seed, "level": room.level,
                    "you": {"userId": player.user_id, "name": player.display_name},
                    "participants": _participants_payload(room),
                })
            elif t == "join":
                code = (first.get("roomCode") or "").strip().upper()
                name = (first.get("name") or "Player").strip()[:32] or "Player"
                try:
                    room, player = await _manager.join(code, name=name)
                except RuntimeError as e:
                    await ws.send_json({"type": "error", "message": str(e)})
                    await ws.close(); return
                player.ws = ws
                await _manager.attach(room, player)
                await _send(player, {
                    "type": "joined",
                    "roomCode": room.code, "seed": room.seed, "level": room.level,
                    "you": {"userId": player.user_id, "name": player.display_name},
                    "participants": _participants_payload(room),
                })
                await _broadcast(room, {
                    "type": "participantJoined",
                    "participants": _participants_payload(room),
                }, except_uid=player.user_id)
            else:
                await ws.send_json({"type": "error", "message": "first msg must be create/join"})
                await ws.close(); return

            # Main loop.
            while True:
                try:
                    msg = await _recv_json_bounded(ws)
                except ValueError as e:
                    # Oversize / malformed payload — log & close.
                    logger.info("ws_race closing (%s): %s", client_ip, e)
                    await ws.close(code=status.WS_1009_MESSAGE_TOO_BIG)
                    return
                kind = msg.get("type")

                if kind == "ready":
                    player.ready = True
                    await _broadcast(room, {
                        "type": "participantUpdate",
                        "participants": _participants_payload(room),
                    })
                    if await _manager.maybe_start(room):
                        await _broadcast(room, {"type": "started"})

                elif kind == "progress":
                    now = time.time() * 1000
                    if now - player.last_progress_at < PROGRESS_THROTTLE_MS:
                        continue
                    player.last_progress_at = now
                    player.progress = int(msg.get("cellsFilled", 0))
                    player.mistakes = int(msg.get("mistakes", 0))
                    await _broadcast(room, {
                        "type": "progressUpdate",
                        "userId": player.user_id,
                        "progress": player.progress,
                        "mistakes": player.mistakes,
                    }, except_uid=player.user_id)

                elif kind == "finish":
                    rank = await _manager.record_finish(
                        room, player,
                        client_time_seconds=int(msg.get("timeSeconds", 0)),
                        mistakes=int(msg.get("mistakes", 0)),
                    )
                    await _broadcast(room, {
                        "type": "finished",
                        "userId": player.user_id,
                        "name": player.display_name,
                        "rank": rank,
                        "timeSeconds": player.finish_time_seconds,
                        "mistakes": player.mistakes,
                    })
                    if room.status == "finished":
                        await _broadcast(room, {
                            "type": "matchOver",
                            "ranking": _participants_payload(room),
                        })

                elif kind == "leave":
                    break
                else:
                    await _send(player, {"type": "error", "message": f"unknown type {kind!r}"})

        except WebSocketDisconnect:
            pass
        except Exception:
            logger.exception("ws_race handler error")
        finally:
            # Sec audit M1: always release the per-IP slot, even on
            # error / disconnect, otherwise an attacker could exhaust
            # the cap by triggering exceptions repeatedly.
            await _ip_release(client_ip)
            if room and player:
                await _manager.remove_player(room, player.user_id)
                await _broadcast(room, {
                    "type": "participantLeft",
                    "userId": player.user_id,
                    "participants": _participants_payload(room),
                })

    @r.get("/race/health")
    async def health() -> dict[str, Any]:
        # Useful for the UI to probe connectivity before opening the WS.
        async with _manager._lock:
            return {
                "ok": True,
                "rooms": len(_manager._rooms),
                "max_rooms": MAX_ROOMS,
            }

    return r
