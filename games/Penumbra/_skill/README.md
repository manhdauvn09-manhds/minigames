# puzzle-web-game-scaffold

Skill #1 of 5 in the puzzle-web-game build pipeline for Claude Code.

## What it does

Scaffolds a Next.js 14 + TypeScript + Tailwind + Supabase project skeleton from a `game-spec.json` contract file. The output is a runnable but empty project — subsequent skills fill in the game logic.

## Pipeline overview

```
[game-spec.json]
       │
       ▼
┌──────────────────────┐
│ #1 scaffold          │ ◀── you are here
│ project skeleton     │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ #2 engine            │
│ pure puzzle logic    │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ #3 frontend          │
│ components + pages   │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ #4 backend-ai        │
│ API + Supabase + AI  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ #5 finalize          │
│ i18n + tests + CI    │
└──────────────────────┘
       │
       ▼
[ready for production]
```

## Installation (for Claude Code)

1. Copy this folder to `.claude/skills/puzzle-web-game-scaffold/` in your project (or in your home `~/.claude/skills/` for global use).

2. Verify the structure:
   ```
   .claude/
   └── skills/
       └── puzzle-web-game-scaffold/
           ├── SKILL.md
           ├── README.md
           └── references/
               ├── package-deps.md
               ├── config-files.md
               ├── placeholder-ui.md
               └── verification-checklist.md
   ```

3. Open VS Code, open a terminal, and start Claude Code:
   ```bash
   claude
   ```

## Usage

Place your `game-spec.json` in the working directory, then say:

```
Scaffold the project per game-spec.json
```

Or:

```
Bootstrap the puzzle game from spec
```

Claude Code will:
1. Read and validate `game-spec.json`
2. Show you a plan
3. Ask for confirmation
4. Create ~40 files
5. Run `pnpm install` (or npm/yarn, auto-detected)
6. Verify with typecheck + lint + build
7. Report success

Total runtime: 2–5 minutes depending on network speed.

## Requirements

- **Node.js**: ≥ 20
- **Package manager**: pnpm (recommended), yarn, or npm
- **`game-spec.json`** in the current working directory, with at minimum:
  - `meta.gameName`, `meta.gameNameKebab`
  - `tech.stackPreset === "nextjs-supabase"`
  - `uiux.designTokens.colors`
  - `uiux.designTokens.typography.fontDisplay`, `fontBody`
  - `i18n.supportedLocales`, `i18n.defaultLocale`

If `tech.stackPreset` is `vite-supabase` or anything else, the skill will stop with a clear error.

## What this skill does NOT do

- Does not write puzzle engine logic (skill #2)
- Does not write components or pages (skill #3)
- Does not write API routes or AI integration (skill #4)
- Does not write SQL migrations or RLS policies (skill #4)
- Does not write i18n strings, e2e tests, or CI workflows (skill #5)
- Does not run `git init`
- Does not modify `game-spec.json`

## Constraints and assumptions

- The skill assumes Next.js 14+ App Router. It does not support Pages Router.
- The skill assumes Tailwind CSS 3. Tailwind 4 may require minor adjustments.
- The skill respects an existing lockfile if present (uses the matching package manager).

## Output files

See `SKILL.md` Step 4 for the full list. Approximately 40 files in 15 directories.
