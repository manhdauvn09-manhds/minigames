---
name: puzzle-web-game-scaffold
description: Scaffold a complete Next.js 14 + TypeScript + Tailwind + Supabase project skeleton for a puzzle web game from a game-spec.json contract file. Use this skill whenever the user wants to bootstrap, scaffold, initialize, or set up a new puzzle web game project from a game-spec.json file in the working directory. Triggers on phrases like "scaffold the project", "set up the Next.js skeleton", "initialize from game-spec.json", "create the project structure", "bootstrap the puzzle game", or any request to start a new puzzle game web app build. The output is a runnable but empty project — the user runs subsequent skills (engine, frontend, backend-ai, finalize) to fill in actual game logic. This is skill #1 of 5 in the puzzle-web-game pipeline.
---

# puzzle-web-game-scaffold

Skill #1 of 5 in the puzzle-web-game build pipeline. Turns an empty directory containing only `game-spec.json` into a runnable Next.js project skeleton.

**This skill writes scaffolding only. It does NOT write game logic, components, API routes, AI integration, or tests.** Those are skills #2–#5.

## What "done" means

After this skill finishes:

- `pnpm install` (or `npm install`) succeeds
- `pnpm dev` (or `npm run dev`) starts the dev server on port 3000
- The home page renders a minimal hero using the design tokens from `game-spec.json`
- `pnpm build`, `pnpm lint`, `pnpm typecheck` all pass
- Folder structure matches the technical design exactly
- No game logic exists yet — all game files are absent (engine, components, routes)

---

## Workflow

Execute these steps in order. Use the `TodoWrite` tool to track progress so the user can see live status.

### Step 1 — Locate and validate `game-spec.json`

1. Read `game-spec.json` from the current working directory.
2. If the file is missing: print a clear message and stop. Do not proceed.
3. Parse the JSON. If invalid: print the parse error and stop.
4. Validate these required fields exist:
   - `meta.gameName`, `meta.gameNameKebab`
   - `tech.stackPreset` (must be `nextjs-supabase` for this skill; if `vite-supabase`, stop and tell the user this skill only handles `nextjs-supabase`)
   - `uiux.designTokens.colors`
   - `uiux.designTokens.typography.fontDisplay`, `fontBody`
   - `i18n.supportedLocales`, `i18n.defaultLocale`
5. Extract these into local variables for use in subsequent steps:
   - `gameName` from `meta.gameName`
   - `gameNameKebab` from `meta.gameNameKebab`
   - `tagline` from `meta.tagline` (fallback: empty string)
   - `colors` map from `uiux.designTokens.colors`
   - `fontDisplay`, `fontBody`, `fontMono` from `uiux.designTokens.typography`
   - `locales` from `i18n.supportedLocales`
   - `defaultLocale` from `i18n.defaultLocale`
   - `cronSchedule` from `tech.deployment.cron[0].schedule` (fallback: `"50 23 * * *"`)
   - `cronPath` from `tech.deployment.cron[0].path` (fallback: `"/api/cron/daily-generate"`)

### Step 2 — Detect package manager

Check the working directory for existing lockfiles in this priority order:

1. `pnpm-lock.yaml` exists → use `pnpm`
2. `yarn.lock` exists → use `yarn`
3. `package-lock.json` exists → use `npm`
4. None exist → check `pnpm --version` via Bash; if available, use `pnpm`; otherwise `npm`

Store the chosen package manager. Use it consistently in all subsequent commands.

### Step 3 — Echo the plan and ask for confirmation

Print a summary in this exact format:

```
📋 Scaffold plan for {gameName}

  Working dir: {cwd}
  Package manager: {pm}
  Locales: {locales joined with comma}
  Default locale: {defaultLocale}

Files to create (40+ files in 15 directories):
  - package.json + tsconfig.json + tailwind.config.ts + ...
  - src/app/{layout.tsx, page.tsx, globals.css, error.tsx, not-found.tsx}
  - src/lib/supabase/{client.ts, server.ts}
  - src/lib/{config.ts, utils/cn.ts}
  - src/messages/{vi,en,ja}.json (empty stubs)
  - supabase/config.toml (init)
  - tests/, public/, .github/, etc.

Will run after creation:
  - {pm} install
  - {pm} run typecheck
  - {pm} run lint
  - {pm} run build

This may take 2-5 minutes total.
```

Then ask: `Proceed with scaffold? [y/N]`

If the user replies anything other than `y` or `yes` (case-insensitive), stop without creating files.

### Step 4 — Create files in dependency order

Create files in this exact order. Files within the same group can be created in parallel.

**Group A — Root configs (no dependencies):**
- `.gitignore`
- `.eslintrc.json`
- `.prettierrc`
- `.env.example`
- `tsconfig.json`
- `next.config.ts`
- `tailwind.config.ts` ← inject design tokens from spec
- `postcss.config.mjs`
- `vitest.config.ts`
- `playwright.config.ts`
- `vercel.json` ← inject cron config from spec
- `package.json` ← inject `gameNameKebab` as `name` field

For each config file, see `references/config-files.md` for the exact template.

**Group B — Source skeleton:**
- `src/types/index.ts`
- `src/lib/config.ts` ← extract magic numbers from spec
- `src/lib/utils/cn.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/messages/{locale}.json` for each locale in `locales` (content: `{}`)

**Group C — App router files:**
- `src/app/globals.css` ← inject CSS variables from spec colors
- `src/app/layout.tsx` ← font setup using `fontDisplay`, `fontBody`
- `src/app/page.tsx` ← minimal hero with `gameName` + `tagline`
- `src/app/error.tsx`
- `src/app/not-found.tsx`

For exact content, see `references/placeholder-ui.md`.

**Group D — Empty directories (create with `.gitkeep`):**
- `src/components/ui/.gitkeep`
- `src/components/game/.gitkeep`
- `src/components/layout/.gitkeep`
- `src/stores/.gitkeep`
- `tests/unit/.gitkeep`
- `tests/component/.gitkeep`
- `tests/e2e/.gitkeep`
- `public/icons/.gitkeep`
- `public/og/.gitkeep`

**Group E — Supabase init:**
- `supabase/config.toml` (minimal, see `references/config-files.md`)
- `supabase/migrations/.gitkeep` (skill #4 will populate this)

**Group F — README:**
- `README.md` — see `references/placeholder-ui.md` for the template

### Step 5 — Install dependencies

Run the package manager install command:

- pnpm: `pnpm install`
- yarn: `yarn install`
- npm: `npm install`

Stream output to the user. If install fails:
- Show the error
- Common fixes: Node version (require ≥ 20), corrupted lockfile (suggest deleting `node_modules` and lockfile), network issues
- Stop the skill — do not proceed to verification

### Step 6 — Verify the scaffold

Run these three commands in order. All must pass.

```bash
{pm} run typecheck
{pm} run lint
{pm} run build
```

If any fails: show the error output, suggest the most likely cause (see `references/verification-checklist.md`), and stop.

### Step 7 — Final report

Print a success message in this format:

```
✅ Scaffold complete for {gameName}

  Files created: {N}
  Package manager: {pm}
  Build: passing
  Typecheck: passing
  Lint: passing

🚀 What works now:
  - {pm} run dev → http://localhost:3000 → minimal hero
  - {pm} test → no tests yet (expected)
  - {pm} run build → production bundle

📋 Next steps:
  1. Copy .env.example to .env.local and fill in:
     - NEXT_PUBLIC_SUPABASE_URL
     - NEXT_PUBLIC_SUPABASE_ANON_KEY
     - ANTHROPIC_API_KEY (for skill #4)
  2. Run skill #2: puzzle-web-game-engine
     to add pure puzzle logic + tests
  3. Then skill #3 (frontend), #4 (backend-ai), #5 (finalize)

The project is ready. Open in VS Code and run:
  cd {gameNameKebab}    # if you ran this skill from a parent dir
  {pm} run dev
```

---

## Behavioral rules

### Be paranoid about idempotency
If the user re-runs this skill on a directory that already has files, **do not silently overwrite**. Instead:
- Detect existing files (any of: `package.json`, `src/`, `node_modules/`)
- If found: show what exists and ask `Overwrite existing files? [y/N]`
- If user says no: stop without changes

### Never modify `game-spec.json`
This skill reads `game-spec.json` but never writes to it. The spec is the user's contract, treated as read-only.

### Inject, don't hardcode
Whenever a value comes from the spec, inject it. Never hardcode "Penumbra" or specific colors. The skill must work for any valid spec.

Concrete injection points:
- `package.json` → `name` field uses `gameNameKebab`
- `tailwind.config.ts` → `theme.extend.colors` uses spec colors
- `src/app/globals.css` → CSS variables come from spec colors
- `src/app/layout.tsx` → font imports use `fontDisplay`, `fontBody`
- `src/app/page.tsx` → uses `gameName` and `tagline`
- `src/lib/config.ts` → exports values from spec (locales, monetization, etc.)
- `src/messages/*.json` → file count matches `locales` length
- `vercel.json` → cron path and schedule from spec
- `README.md` → name and one-line description from spec

### Don't write game logic
This skill scaffolds. If you find yourself implementing puzzle rules, components, API routes, or AI calls — stop. That's a different skill's job.

### Respect the user's machine
- Do not modify global config (`~/.npmrc`, `~/.gitconfig`, etc.)
- Do not install global packages
- Do not create files outside the working directory

---

## Common mistakes to avoid

1. **Forgetting to inject design tokens** — leaving placeholder colors in `tailwind.config.ts` or `globals.css`. Always read from spec.

2. **Creating SQL migrations** — that's skill #4's job. This skill only creates `supabase/config.toml` and an empty `migrations/` folder.

3. **Creating game components or routes** — `src/components/game/`, `src/app/api/`, `src/app/daily/`, `src/app/levels/` directories should NOT be created. Skills #3 and #4 create them.

4. **Filling i18n message files** — message files are `{}` empty objects. Skill #5 populates them.

5. **Skipping verification** — don't claim success without running `typecheck && lint && build`. A scaffold that doesn't build is useless.

6. **Running `git init`** — the user may already have a git repo. Don't initialize git unless explicitly asked.

---

## Reference files

Read these as needed during execution:

- `references/package-deps.md` — exact dependencies, devDependencies, and `package.json` scripts
- `references/config-files.md` — full content for every config file (tsconfig, tailwind, eslint, etc.)
- `references/placeholder-ui.md` — content for `layout.tsx`, `page.tsx`, `globals.css`, error/404 pages, supabase clients, README
- `references/verification-checklist.md` — what to check after scaffold + common failure modes

For a long file you only need parts of, read targeted sections rather than the whole file.
