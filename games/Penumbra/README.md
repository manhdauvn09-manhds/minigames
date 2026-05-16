# Penumbra

> Trace the line. Find the light.

A puzzle web game built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **State**: Zustand (client) + React Server Components (server)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Animation**: Framer Motion
- **i18n**: next-intl (vi/en/ja)
- **AI**: Anthropic Claude API (hint explainer)
- **Testing**: Vitest + Playwright
- **Deployment**: self-hosted Docker behind nginx — `penumbra.allin1site.com`

## Setup

### Prerequisites

- Node.js ≥ 20
- npm (recommended) or npm
- A Supabase project (free tier works)
- An Anthropic API key (for AI hint, optional in dev)

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required for development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for AI features:
- `ANTHROPIC_API_KEY`

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run test` | Run unit + component tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run format` | Format with Prettier |

## Project structure

See `game-spec.json` for the full design contract that drives this project.

## Build pipeline

This project is being built with the puzzle-web-game pipeline of skills:

- ✅ #1 scaffold — project skeleton (this step)
- ⏳ #2 engine — pure puzzle logic
- ⏳ #3 frontend — components and pages
- ⏳ #4 backend-ai — API routes and AI integration
- ⏳ #5 finalize — i18n, e2e tests, CI/CD

Skill docs and the original SKILL.md are archived in `_skill/`.
