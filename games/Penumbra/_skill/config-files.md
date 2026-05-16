# Config Files

Exact templates for every configuration file. Inject values from `game-spec.json` where indicated by `{{placeholder}}`. Leave the rest verbatim.

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## `next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## `tailwind.config.ts` ⚠️ inject design tokens

This file MUST include design tokens from `game-spec.json` `uiux.designTokens`. Generate the `colors`, `fontFamily`, `boxShadow`, and `transitionTimingFunction` blocks dynamically.

**Template** (replace `{{...}}` placeholders):

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          elevated: "var(--bg-elevated)",
        },
        surface: {
          soft: "var(--surface-soft)",
          hard: "var(--surface-hard)",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        fg: {
          primary: "var(--fg-primary)",
          secondary: "var(--fg-secondary)",
          muted: "var(--fg-muted)",
          disabled: "var(--fg-disabled)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          glow: "var(--accent-glow)",
          deep: "var(--accent-deep)",
        },
        cell: {
          empty: "var(--cell-empty)",
          bright: "var(--cell-bright)",
          void: "var(--cell-void)",
          path: "var(--cell-path)",
          hint: "var(--cell-hint)",
          portal: "var(--cell-portal)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      fontFamily: {
        display: [{{fontDisplaySplit}}],
        body: [{{fontBodySplit}}],
        mono: [{{fontMonoSplit}}],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.16, 1, 0.3, 1)",
        firm: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      boxShadow: {
        "glow-accent": "0 0 24px rgba(201,160,98,0.4)",
        "glow-success": "0 0 24px rgba(110,159,118,0.4)",
        "glow-hint": "0 0 32px rgba(143,168,196,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
```

**Injection rules:**

1. **`fontFamily.display`, `body`, `mono`**: split the spec's font string by comma into a quoted array.
   - Example spec: `"fontDisplay": "Cormorant Garamond, Noto Serif JP, serif"`
   - Inject as: `["Cormorant Garamond", "Noto Serif JP", "serif"]`
   - Trim each item.

2. **`colors`**: the keys above (`bg.primary`, `accent.DEFAULT`, etc.) reference CSS variables from `globals.css`. The actual hex values live in `globals.css`, NOT here. This file just creates Tailwind class aliases.

3. **`boxShadow.glow-accent`**: if `spec.uiux.designTokens.shadows.glowAccent` exists, use that exact rgba value. Otherwise use the default shown above.

---

## `postcss.config.mjs`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/component/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/puzzle/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Also create `tests/setup.ts` with this content:

```ts
import "@testing-library/jest-dom/vitest";
```

---

## `playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

If the chosen package manager is not pnpm, replace `pnpm dev` with the appropriate command.

---

## `.eslintrc.json`

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "react/no-unescaped-entities": "off",
    "@next/next/no-page-custom-font": "off"
  }
}
```

---

## `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

---

## `.gitignore`

```gitignore
# dependencies
node_modules/
.pnp
.pnp.js
.yarn/install-state.gz

# testing
coverage/
playwright-report/
test-results/

# next.js
.next/
out/

# production
build/
dist/

# misc
.DS_Store
*.pem
.idea/
.vscode/
!.vscode/settings.json

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# local env files
.env
.env.local
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# supabase
supabase/.branches
supabase/.temp
```

---

## `.env.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic (for AI hint explainer — needed by skill #4)
ANTHROPIC_API_KEY=your-anthropic-key

# Upstash Redis (for rate limiting — needed by skill #4)
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Vercel Cron (security)
CRON_SECRET=generate-with-openssl-rand-hex-32

# Sentry (optional in dev)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# PostHog (optional in dev)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## `vercel.json` ⚠️ inject cron from spec

```json
{
  "crons": [
    {
      "path": "{{cronPath}}",
      "schedule": "{{cronSchedule}}"
    }
  ]
}
```

**Injection rules:**

- `{{cronPath}}` from `spec.tech.deployment.cron[0].path` (default: `"/api/cron/daily-generate"`)
- `{{cronSchedule}}` from `spec.tech.deployment.cron[0].schedule` (default: `"50 23 * * *"`)
- If the spec's `cron` array has multiple entries, include all of them.
- If the spec has no cron entries at all, omit the `crons` key — output `{}`.

---

## `supabase/config.toml`

Minimal config to mark this as a Supabase project. Skill #4 will add the full config.

```toml
# A string used to distinguish different Supabase projects on the same host. Defaults to the
# working directory name when running `supabase init`.
project_id = "{{gameNameKebab}}"

[api]
enabled = true
port = 54321
schemas = ["public", "storage", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 3600
enable_signup = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
```

`{{gameNameKebab}}` from `spec.meta.gameNameKebab`.

---

## File creation order

To minimize rework if anything fails partway:

1. `package.json` first (defines the project)
2. `tsconfig.json`, `.eslintrc.json`, `.prettierrc`, `.gitignore`
3. `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`
4. `vitest.config.ts`, `playwright.config.ts`
5. `.env.example`, `vercel.json`
6. `supabase/config.toml`
7. Source files (see `placeholder-ui.md`)
8. Empty directories with `.gitkeep` (Group D in SKILL.md Step 4)

If `pnpm install` fails after step 1, the user can fix `package.json` and re-run install without losing other progress.
