# syntax=docker/dockerfile:1.6
# ─── Sodoku multiplayer race backend ───
# Standalone FastAPI WebSocket service for sodoku.allin1site.com.
# Was previously bundled inside the 24hHotNewsAI BE (app/sudoku/race.py);
# lifted out so AllIn1Site is fully self-contained.

FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
         curl ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# main.py imports race directly as a sibling module (flat layout, no
# package wrapper) — same pattern as the portal service.
COPY __init__.py race.py main.py ./

RUN useradd --create-home --shell /bin/bash --uid 10000 sudoku \
    && chown -R sudoku:sudoku /app
USER sudoku

EXPOSE 8699

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8699/api/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8699", \
     "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
