"""Standalone FastAPI app for the Sodoku multiplayer race backend.

Runs as a sibling service to the Sodokugame FE container. nginx on
`sodoku.allin1site.com` routes:

    /api/sudoku/*  → this service (port 8699 inside container)
    /              → Sodokugame FE (nginx static, port 8697)

In-memory state (matches the original behaviour from when this code
lived inside the 24hHotNewsAI BE) — single replica only. Restart wipes
all active rooms; in-flight races abort cleanly via the WS close path
in `race.py`.

Listens on :8699 inside the container (mapped to 127.0.0.1:8699 on
host). The WebSocket origin allow-list is controlled by
`SODOKU_RACE_ORIGINS` env (comma-separated; default
`https://sodoku.allin1site.com`).
"""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse

from race import build_router as build_race_router

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)
logger = logging.getLogger("allin1site.sudoku")

app = FastAPI(title="AllIn1Site Sudoku Backend", version="1.0.0")

app.include_router(build_race_router())
logger.info("Sudoku race router mounted at /api/sudoku/*")


@app.get("/api/sudoku/race/health", response_class=PlainTextResponse)
async def race_health():
    return PlainTextResponse("ok")


@app.get("/api/health", response_class=PlainTextResponse)
async def api_health():
    return PlainTextResponse("ok")
