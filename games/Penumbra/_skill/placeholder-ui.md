# Placeholder UI & Source Files

Templates for all source files created by this skill. Inject values from `game-spec.json` where indicated.

---

## `src/app/globals.css` ⚠️ inject CSS variables

This file holds the actual color hex values as CSS variables. `tailwind.config.ts` references these via `var(--*)`.

**Generation rule:** for every key in `spec.uiux.designTokens.colors`, emit a CSS variable. Convert kebab-case keys to CSS variable names (they're already kebab-case).

**Template:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
{{cssVariableBlock}}
  }

  html {
    color-scheme: dark;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--fg-primary);
    font-family: var(--font-body), system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Respect reduced-motion preference globally */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Focus visibility */
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }
}
```

**Generating `{{cssVariableBlock}}`:**

For each key-value pair in `spec.uiux.designTokens.colors`, emit one indented line:
```css
    --{key}: {value};
```

Example: if spec has `"bg-primary": "#0A0E14"`, emit:
```
    --bg-primary: #0A0E14;
```

Concatenate all lines with newlines. Indent each with 4 spaces.

**Also inject font CSS variables.** After the colors, add (with literal values, not from spec — Next/font handles loading):

```css
    /* Font variables — assigned by next/font in layout.tsx */
    --font-display: var(--font-display-loaded);
    --font-body: var(--font-body-loaded);
    --font-mono: var(--font-mono-loaded);
```

---

## `src/app/layout.tsx` ⚠️ inject font names + game metadata

This file sets up the root HTML, loads fonts, and applies global metadata.

**Template:**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { {{primaryDisplayFont}}, {{primaryBodyFont}} } from "next/font/google";

const fontDisplay = {{primaryDisplayFont}}({
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});

const fontBody = {{primaryBodyFont}}({
  subsets: ["latin"],
  variable: "--font-body-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "{{gameName}}",
  description: "{{tagline}}",
  applicationName: "{{gameName}}",
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "{{bgPrimaryHex}}",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="{{defaultLocale}}" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**Injection rules:**

- `{{primaryDisplayFont}}`: take the FIRST font in `spec.uiux.designTokens.typography.fontDisplay` and convert to a `next/font/google` import name.
  - Example: `"Cormorant Garamond"` → `Cormorant_Garamond` (replace spaces with underscores).
- `{{primaryBodyFont}}`: same rule for `fontBody`. Example: `"Inter"` → `Inter`.
- **Edge case**: if the first font isn't on Google Fonts (e.g., a system stack like `system-ui`), use the second item. If no Google font available, fall back to `Inter` (always available).
- `{{gameName}}` from `spec.meta.gameName`.
- `{{tagline}}` from `spec.meta.tagline` (fallback: `""`).
- `{{bgPrimaryHex}}` from `spec.uiux.designTokens.colors["bg-primary"]`.
- `{{defaultLocale}}` from `spec.i18n.defaultLocale`.

---

## `src/app/page.tsx` ⚠️ inject game name and tagline

Minimal hero. Validates that design tokens flow end-to-end (CSS vars → Tailwind → component).

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6">
      <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="font-display text-5xl text-fg-primary md:text-6xl">
          {{gameName}}
        </h1>
        {{taglineBlock}}
        <button
          type="button"
          className="rounded-md border border-accent px-6 py-3 font-body text-sm text-accent transition-colors duration-200 ease-soft hover:bg-accent hover:text-bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          disabled
        >
          Coming soon
        </button>
        <p className="font-mono text-xs text-fg-muted">
          Scaffold complete · skills 2-5 will fill in game logic
        </p>
      </div>
    </main>
  );
}
```

**Injection rules:**

- `{{gameName}}` from `spec.meta.gameName`.
- `{{taglineBlock}}`:
  - If `spec.meta.tagline` is non-empty, emit:
    ```tsx
    <p className="font-body text-lg text-fg-secondary md:text-xl">
      {{tagline}}
    </p>
    ```
  - If empty, omit the entire `<p>` element (don't emit empty tags).

---

## `src/app/error.tsx`

```tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      <h1 className="font-display text-3xl text-fg-primary">Something slipped into shadow.</h1>
      <p className="mt-4 font-body text-fg-secondary">An unexpected error occurred.</p>
      <button
        onClick={reset}
        type="button"
        className="mt-8 rounded-md border border-accent px-6 py-3 font-body text-sm text-accent transition-colors hover:bg-accent hover:text-bg-primary"
      >
        Try again
      </button>
    </main>
  );
}
```

---

## `src/app/not-found.tsx`

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      <h1 className="font-display text-5xl text-fg-primary">404</h1>
      <p className="mt-4 font-body text-fg-secondary">This path leads nowhere.</p>
      <Link
        href="/"
        className="mt-8 rounded-md border border-accent px-6 py-3 font-body text-sm text-accent transition-colors hover:bg-accent hover:text-bg-primary"
      >
        Return home
      </Link>
    </main>
  );
}
```

---

## `src/lib/utils/cn.ts`

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## `src/lib/supabase/client.ts`

Browser client. Used in Client Components.

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

---

## `src/lib/supabase/server.ts`

Cookie-aware server client. Used in Server Components and Route Handlers.

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies; safe to ignore
            // when middleware refreshes the session.
          }
        },
      },
    },
  );
}
```

---

## `src/lib/config.ts` ⚠️ inject from spec

Magic numbers and strings. The skill extracts these from `spec` so other code can import them without re-reading the spec.

**Template** (replace `{{...}}` with values from spec):

```ts
/**
 * Game configuration extracted from game-spec.json.
 * Edit game-spec.json and re-run scaffold to update.
 */

export const gameConfig = {
  name: "{{gameName}}",
  nameKebab: "{{gameNameKebab}}",
  tagline: "{{tagline}}",
  scopeTier: "{{scopeTier}}" as const,

  i18n: {
    defaultLocale: "{{defaultLocale}}",
    supportedLocales: {{supportedLocalesArray}} as const,
    fallbackChain: {{fallbackChainObject}},
  },

  hint: {
    initialBalance: {{initialBalance}},
    dailyRefillTo: {{dailyRefillTo}},
    maxBalance: {{maxBalance}},
    perUserDailyAICap: {{perUserDailyAICap}},
    tiers: {{hintTiersArray}} as const,
  },

  daily: {
    rolloverTime: "{{rolloverTime}}",
    sameForAllUsers: {{sameForAllUsers}},
    archiveAfterDays: {{archiveAfterDays}},
  },

  monetization: {
    model: "{{monetizationModel}}" as const,
    adsEnabled: {{adsEnabled}},
    interstitialEveryNLevels: {{interstitialEveryNLevels}},
    disabledOnFirstNLevels: {{disabledOnFirstNLevels}},
  },

  features: {{featuresFlatObject}},
} as const;

export type GameConfig = typeof gameConfig;
```

**Injection rules:**

| Placeholder | Source | Default if missing |
|---|---|---|
| `{{gameName}}` | `spec.meta.gameName` | (required, error) |
| `{{gameNameKebab}}` | `spec.meta.gameNameKebab` | (required, error) |
| `{{tagline}}` | `spec.meta.tagline` | `""` |
| `{{scopeTier}}` | `spec.scope.tier` | `"mvp-plus-ai"` |
| `{{defaultLocale}}` | `spec.i18n.defaultLocale` | `"en"` |
| `{{supportedLocalesArray}}` | `spec.i18n.supportedLocales` as JSON array literal | `["en"]` |
| `{{fallbackChainObject}}` | `spec.i18n.fallbackChain` as JSON object | `{}` |
| `{{initialBalance}}` | `spec.hintSystem.initialBalance` | `3` |
| `{{dailyRefillTo}}` | `spec.hintSystem.dailyRefillTo` | `3` |
| `{{maxBalance}}` | `spec.hintSystem.maxBalance` | `20` |
| `{{perUserDailyAICap}}` | `spec.ai.hintExplainer.perUserDailyCap` | `5` |
| `{{hintTiersArray}}` | `spec.hintSystem.tiers` as JSON literal | `[]` |
| `{{rolloverTime}}` | `spec.dailyPuzzle.rolloverTime` | `"00:00 UTC"` |
| `{{sameForAllUsers}}` | `spec.dailyPuzzle.sameForAllUsers` | `true` |
| `{{archiveAfterDays}}` | `spec.dailyPuzzle.archiveAfterDays` | `90` |
| `{{monetizationModel}}` | `spec.monetization.model` | `"none"` |
| `{{adsEnabled}}` | `spec.monetization.ads.enabled` | `false` |
| `{{interstitialEveryNLevels}}` | `spec.monetization.ads.interstitialEveryNLevels` | `5` |
| `{{disabledOnFirstNLevels}}` | `spec.monetization.ads.disabledOnFirstNLevels` | `10` |
| `{{featuresFlatObject}}` | `spec.features` flattened to a single-level object as JSON | `{}` |

**Flattening `features`:** for each category in `spec.features` (core, engagement, social, ai, monetization, accessibility), emit each subkey at the top level. Example:
```ts
{ scoringStars: true, hintSystem: true, dailyStreak: true, achievements: true, ... }
```
Use `JSON.stringify` with 2-space indent for readable output.

---

## `src/types/index.ts`

Type re-exports. Skill #2 will populate this.

```ts
/**
 * Public type exports for the {{gameName}} game.
 *
 * Skill #2 (engine) will add puzzle types here.
 * Skill #3 (frontend) will add UI types here.
 */

export type {};
```

`{{gameName}}` from `spec.meta.gameName`.

---

## `src/messages/{locale}.json`

For each locale in `spec.i18n.supportedLocales`, create a file with content:

```json
{}
```

Skill #5 will populate these.

Example: if `supportedLocales` is `["vi", "en", "ja"]`, create:
- `src/messages/vi.json`
- `src/messages/en.json`
- `src/messages/ja.json`

Each containing only `{}`.

---

## `tests/setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
```

---

## `README.md` ⚠️ inject game info

Vừa đủ — không marketing, không screenshots. Skill #5 polishes.

**Template:**

```markdown
# {{gameName}}

> {{tagline}}

A puzzle web game built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Tech stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **State**: Zustand (client) + React Server Components (server)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Animation**: Framer Motion
- **i18n**: next-intl ({{localesList}})
- **AI**: Anthropic Claude API (hint explainer)
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel

## Setup

### Prerequisites

- Node.js ≥ 20
- {{packageManager}} (recommended) or npm
- A Supabase project (free tier works)
- An Anthropic API key (for AI hint, optional in dev)

### Install

```bash
{{pmInstall}}
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
{{pmRun}} dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `{{pmRun}} dev` | Start dev server on port 3000 |
| `{{pmRun}} build` | Production build |
| `{{pmRun}} start` | Run production build |
| `{{pmRun}} lint` | ESLint |
| `{{pmRun}} typecheck` | TypeScript check (no emit) |
| `{{pmRun}} test` | Run unit + component tests once |
| `{{pmRun}} test:watch` | Run tests in watch mode |
| `{{pmRun}} test:e2e` | Run Playwright e2e tests |
| `{{pmRun}} format` | Format with Prettier |

## Project structure

See `game-spec.json` for the full design contract that drives this project.

## Build pipeline

This project is being built with the puzzle-web-game pipeline of skills:

- ✅ #1 scaffold — project skeleton (this step)
- ⏳ #2 engine — pure puzzle logic
- ⏳ #3 frontend — components and pages
- ⏳ #4 backend-ai — API routes and AI integration
- ⏳ #5 finalize — i18n, e2e tests, CI/CD
```

**Injection rules:**

- `{{gameName}}` from `spec.meta.gameName`
- `{{tagline}}` from `spec.meta.tagline` (fallback: `"A puzzle web game"`)
- `{{localesList}}`: spec locales joined with `/`. Example: `vi/en/ja`
- `{{packageManager}}`: chosen package manager
- `{{pmInstall}}`: install command (`pnpm install`, `npm install`, `yarn`)
- `{{pmRun}}`: run prefix (`pnpm`, `npm run`, `yarn`)
