# Package Dependencies

Use this exact set of dependencies and scripts when generating `package.json`.

The `name` field of `package.json` MUST be set to `meta.gameNameKebab` from `game-spec.json`.

---

## `package.json` template

Inject `gameNameKebab` and `gameName` (for description). Leave the rest verbatim.

```json
{
  "name": "{{gameNameKebab}}",
  "version": "0.1.0",
  "private": true,
  "description": "{{gameName}} — a puzzle web game",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "zustand": "^4.5.4",
    "framer-motion": "^11.3.0",
    "next-intl": "^3.17.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-tooltip": "^1.1.2",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "@upstash/ratelimit": "^2.0.0",
    "@upstash/redis": "^1.34.0",
    "posthog-js": "^1.155.0",
    "@sentry/nextjs": "^8.20.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^25.0.0",
    "@playwright/test": "^1.46.0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "packageManager": "pnpm@9.7.0"
}
```

**Notes for the skill:**

- Set `description` field to `"{{gameName}} — a puzzle web game"`.
- If the chosen package manager is npm or yarn instead of pnpm, **remove** the `packageManager` field. This avoids forcing a specific PM via Corepack.
- If the user runs install with a different PM than `packageManager` declares, pnpm will warn. Removing the field for non-pnpm cases is safer.

---

## Why each dep

A short justification for each dependency. The skill should NOT print this — it's reference info for skill maintenance.

| Dependency | Purpose |
|---|---|
| `next`, `react`, `react-dom` | Framework |
| `@supabase/supabase-js`, `@supabase/ssr` | DB + Auth + Storage; SSR-aware client for App Router |
| `zustand` | Client puzzle state (no Redux/Jotai needed) |
| `framer-motion` | Layout animations + complex orchestration |
| `next-intl` | App Router-compatible i18n |
| `lucide-react` | Icon set, thin-stroke matches dark vibe |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Component variant systems + class composition |
| `react-hook-form`, `zod`, `@hookform/resolvers` | Forms + validation, shared client/server |
| `@radix-ui/*` | Headless accessible primitives (Dialog, Toast, etc.) |
| `@anthropic-ai/sdk` | Claude API for AI hint explainer |
| `@upstash/ratelimit`, `@upstash/redis` | Per-user/global rate limiting on AI endpoint |
| `posthog-js` | Privacy-friendly analytics |
| `@sentry/nextjs` | Error tracking, server + client |

| Dev Dependency | Purpose |
|---|---|
| `typescript` | Type checking |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling pipeline |
| `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss` | Linting + formatting |
| `vitest`, `@vitest/ui`, `@testing-library/*`, `jsdom` | Unit + component testing |
| `@playwright/test` | E2E testing |

---

## Pinning policy

All dependencies use caret ranges (`^x.y.z`) to allow patch and minor updates. The lockfile (created on first install) pins exact versions for reproducibility.

If pinning policy needs to change in the future (e.g., switch to exact versions for stability), update this file and regenerate `package.json`.

---

## What's NOT included

These are intentionally NOT installed by skill #1. They will be added by later skills if needed:

- `howler` — audio library; deferred to skill #3 if/when sound is implemented (currently out of v1 scope per spec)
- Any specific testing helpers like `msw`, `whatwg-fetch` — added by skill #5 if needed
- `@vercel/og` — for OG image generation; added by skill #4 if implemented
