# Sodoku — Sudoku game subapp

Multi-difficulty Sudoku 9x9 played entirely in the browser. Lives on
`https://sodoku.allin1site.com` as a Portal subapp under `allin1site.com`.

## Status (2026-04-26)

| Phase | Status | Output |
|-------|--------|--------|
| 0 — Ship existing `Design/` via subdomain    | ✅ LIVE on `https://sodoku.allin1site.com` |
| 1 — Vite + TypeScript + Tailwind scaffold    | ✅ Files in repo, awaiting first `npm install` + `npm run build` |
| 2 — Core engine (validator/solver/generator) | ✅ 45 tests pass; L1-L5 generate <16ms |
| 3 — Zustand state + auth client              | ✅ 19 store tests pass; TS strict build clean |
| 4 — UI components (Board, NumberPad, screens)| ✅ Vite build OK (207KB / 67KB gz); `npm run dev` plays the game |
| 5 — Daily challenge + PWA + achievements     | ✅ 78 tests pass; daily streak, 10 achievements, Web Audio SFX, PWA installable (220KB / 70KB gz) |
| 6 — Production build switch (dist/ in image) | ✅ LIVE on https://sodoku.allin1site.com (multi-stage build inside Docker, no local-state dep) |
| 7A — Leaderboard backend (FastAPI on parent) | TODO |
| 7B — Multiplayer race (FastAPI WebSocket)    | ✅ LIVE — 2-player race via wss://allin1site.com/api/sudoku/ws/race |

Detailed plan in `SUDOKU_PROJECT_PLAN.md`. Note: that doc was written
assuming Express parent + npm monorepo; we adapted to FastAPI Python
parent + standalone subapp directory.

## Layout

```
Sodokugame/
├── Design/                  ← Phase 0 source: React via UMD CDN + Babel.
│   ├── Sudoku.html          ← Phase 0 entry; Dockerfile copies → index.html
│   ├── src/                 ← original sudoku.js, App.jsx, Board.jsx, etc.
│   ├── components/, styles/, assets/
│   └── scraps/, screenshots/ ← excluded from image via .dockerignore
│
├── src/                     ← Phase 1 scaffold (Vite + TS + Tailwind)
│   ├── core/                ← engine (Phase 2)
│   ├── store/               ← Zustand stores (Phase 3)
│   ├── components/          ← Board / screens (Phase 4)
│   ├── lib/                 ← auth client, API client, socket client
│   ├── locales/             ← vi/en/ja
│   └── utils/, hooks/
│
├── package.json, vite.config.ts, tsconfig.json, tailwind.config.js, ...
├── Dockerfile               ← Phase 0: copies Design/* → nginx html/
├── nginx.conf               ← static SPA + /health probe
├── .dockerignore            ← excludes Phase 1 scaffold from Phase 0 image
├── DESIGN_TOKENS.md         ← extracted token reference
└── SUDOKU_PROJECT_PLAN.md   ← original 7-phase plan
```

## Local development (Phase 1+ only)

Requires Node 18.18+. Once Phase 1 packages are installed:

```bash
cd Crawler&Admin/server/app/portal/subapp/Sodokugame
npm install
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # produces dist/ for Phase 6 deploy switch
npm run test         # Vitest (no tests yet — Phase 2 lands them)
```

## Deploy (Phase 0 — current)

Subapp is part of the `subapps` docker-compose stack. Deploy via:

```bash
SERVER_PASS=... python scripts/ssh_deploy_be.py        # uploads source + nginx vhost
SERVER_PASS=... python scripts/ssh_deploy_subapps.py   # builds image + brings up
SERVER_PASS=... LE_EMAIL=you@x.com python scripts/ssh_setup_ssl_subapps.py
```

See `Crawler&Admin/docker-compose.yml` (BE) and `docker-compose.subapps.yml`
(this subapp) for the runtime topology.

## Phase 6 cutover (later)

When Phase 5 is done, the `Dockerfile` switches from copying `Design/*`
to copying `dist/` (the Vite build output). Three lines change:

```dockerfile
# Before (Phase 0):
COPY Design/Sudoku.html  /usr/share/nginx/html/index.html
COPY Design/src/         /usr/share/nginx/html/src/
COPY Design/components/  /usr/share/nginx/html/components/
COPY Design/styles/      /usr/share/nginx/html/styles/
COPY Design/assets/      /usr/share/nginx/html/assets/

# After (Phase 6):
COPY dist/  /usr/share/nginx/html/
```

`Design/` stays in the repo as a reference until Phase 7 ships, then
can be archived or deleted.
