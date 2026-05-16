# Verification Checklist

Run these checks after creating files. The skill must not declare success unless all pass.

---

## Required commands (in order)

### 1. `{pm} run typecheck`

Runs `tsc --noEmit`. Must exit with code 0.

**Common failures:**
- `Cannot find module '@/...'` → `tsconfig.json` is missing the `paths` alias. Re-check the file content.
- `Cannot find module '@supabase/ssr'` → install didn't complete; re-run `{pm} install`.
- `Type '...' is not assignable to type 'never'` in font imports → `next/font/google` import name mismatch. Verify the spec's `fontDisplay`/`fontBody` first item is a real Google Font, with spaces converted to underscores.

### 2. `{pm} run lint`

Runs `next lint`. Must exit with code 0.

**Common failures:**
- `eslint-config-next not found` → install didn't complete.
- Lint errors in placeholder pages → very rare; if it happens, check that `globals.css` doesn't have an unclosed `@layer` block.

### 3. `{pm} run build`

Runs `next build`. Must complete without errors. Warnings are OK.

**Common failures:**
- `Module not found: Can't resolve '@/...'` → `paths` alias issue (same as typecheck).
- `Type error: Cannot find module 'next-intl/...'` → `next-intl` was installed but not yet wired up. This skill leaves `next-intl` unused (skill #5 wires it). If a typecheck error mentions next-intl, the user has imported it before skill #5 — not this skill's concern.
- Font loading errors at build time → connectivity issue or wrong font name. Check that the Google Font name (with underscores) matches the import.

---

## File presence checks

After creating files, verify each of these exists:

```
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
postcss.config.mjs
.eslintrc.json
.prettierrc
.gitignore
.env.example
vercel.json
vitest.config.ts
playwright.config.ts
README.md

src/app/layout.tsx
src/app/page.tsx
src/app/globals.css
src/app/error.tsx
src/app/not-found.tsx

src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/config.ts
src/lib/utils/cn.ts

src/types/index.ts

tests/setup.ts

supabase/config.toml
```

Plus one `src/messages/{locale}.json` per locale in `spec.i18n.supportedLocales`.

Plus `.gitkeep` files in:
```
src/components/ui/.gitkeep
src/components/game/.gitkeep
src/components/layout/.gitkeep
src/stores/.gitkeep
tests/unit/.gitkeep
tests/component/.gitkeep
tests/e2e/.gitkeep
public/icons/.gitkeep
public/og/.gitkeep
supabase/migrations/.gitkeep
```

---

## File content sanity checks

After all files are created, run quick spot-checks:

### `package.json`
- `name` field equals `spec.meta.gameNameKebab`
- `dependencies.next` is present
- `dependencies["@supabase/supabase-js"]` is present
- `scripts.dev`, `scripts.build`, `scripts.test` are present

### `tailwind.config.ts`
- `theme.extend.colors.bg` exists
- `theme.extend.colors.accent.DEFAULT` references `var(--accent)`
- `theme.extend.fontFamily.display` is a non-empty array

### `src/app/globals.css`
- Contains `@tailwind base;`
- Contains a `--bg-primary:` line under `:root`
- The hex value of `--bg-primary` matches `spec.uiux.designTokens.colors["bg-primary"]`

### `src/app/page.tsx`
- Contains `{spec.meta.gameName}` literally as the heading text
- Has `bg-bg-primary` class (proves Tailwind tokens flow through)

### `src/lib/config.ts`
- `gameConfig.name` equals `spec.meta.gameName`
- `gameConfig.i18n.supportedLocales` matches `spec.i18n.supportedLocales`

### `vercel.json`
- `crons[0].path` equals the spec's cron path (or default)

---

## Negative checks (these should NOT exist)

If any of these exist, scaffold went too far — fix before declaring success:

```
src/lib/puzzle/engine.ts          ← skill #2's job
src/lib/puzzle/generator.ts       ← skill #2's job
src/lib/puzzle/validator.ts       ← skill #2's job
src/lib/puzzle/hint.ts            ← skill #2's job

src/components/game/PuzzleBoard.tsx     ← skill #3's job
src/components/game/BoardCell.tsx       ← skill #3's job
src/components/ui/Button.tsx            ← skill #3's job

src/app/api/                      ← skill #4's job
src/app/daily/                    ← skill #3's job
src/app/levels/                   ← skill #3's job

supabase/migrations/*.sql         ← skill #4's job
.github/workflows/                ← skill #5's job
```

If any of the above were created, this skill overreached. Delete them and report it.

---

## Smoke test (optional, only if user confirms)

After all checks pass, suggest the user run:

```bash
{pm} run dev
```

And open `http://localhost:3000` in a browser. They should see:
- A page with dark background (the `--bg-primary` color)
- The game name in a serif font (display font)
- The tagline below in a sans-serif font (body font)
- An accent-colored "Coming soon" disabled button
- A small monospace "Scaffold complete" line at the bottom

If colors look wrong: design token injection failed. Check `globals.css`.
If fonts look default: `next/font` import failed. Check `layout.tsx` and confirm fonts are on Google Fonts.

Don't auto-run `dev` — it would hang the skill since dev is a long-running process. Just suggest it.

---

## Reporting format

After all verification passes, output the success message exactly as specified in `SKILL.md` Step 7. Don't add extra prose. The user is busy and trusts a clean report.

If verification fails:
- Print which check failed
- Print the relevant error output (truncated to first 30 lines)
- Suggest the most likely cause from this file
- Stop. Do not retry automatically.
