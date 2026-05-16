# Sudoku Game — Kế hoạch Triển khai Chi tiết

> **Dự án**: Professional Sudoku Game (Progressive Web App + Backend)
> **Local path**: `E:\SourceCode\24hHotnewsAI\Crawler&Admin\server\app\portal\subapp\Sodokugame`
> **Target**: `sudoku.games.allin1site.com`
> **Parent portal**: `allin1site.com` (Node/Express, có sẵn auth system)
> **Author**: Prepared for Đậu Sỹ Mạnh

---

## Mục lục

1. [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
2. [Chiến lược Subdomain & DNS](#chiến-lược-subdomain--dns)
3. [Portal Integration Strategy](#portal-integration-strategy)
4. [Phase 0 — Pre-flight Decisions](#phase-0--pre-flight-decisions)
5. [Phase 1 — Project Setup & Design Tokens](#phase-1--project-setup--design-tokens)
6. [Phase 2 — Core Sudoku Engine](#phase-2--core-sudoku-engine)
7. [Phase 3 — State Management](#phase-3--state-management)
8. [Phase 4 — UI Components](#phase-4--ui-components)
9. [Phase 5 — Advanced Features](#phase-5--advanced-features)
10. [Phase 6 — Build & Deploy](#phase-6--build--deploy)
11. [Phase 7 — Backend: Leaderboard & Multiplayer](#phase-7--backend-leaderboard--multiplayer)
12. [Phụ lục](#phụ-lục)

---

## Tổng quan kiến trúc

```
┌────────────────────────────────────────────────────────────┐
│  allin1site.com (Parent Portal - existing)                 │
│  ├── Auth Service (shared session at .allin1site.com)      │
│  ├── User Database (shared)                                │
│  └── Shared UI Components (header, footer, user menu)      │
└────────────────────────────────────────────────────────────┘
                          │
                          │ shared cookie: .allin1site.com
                          │ REST API: portal.allin1site.com/api/auth/me
                          ▼
┌────────────────────────────────────────────────────────────┐
│  sudoku.games.allin1site.com (This project)                │
│                                                            │
│  Frontend (SPA — React + Vite):                            │
│  ├── Core Engine (Generator/Solver — pure TS)              │
│  ├── Game UI (Board, NumberPad, Modals)                    │
│  ├── Shared Auth Client (reads cookie from parent)         │
│  └── Shared Shell (Header/Footer from parent)              │
│                                                            │
│  Backend (Node/Express + Socket.IO):                       │
│  ├── Leaderboard API                                       │
│  ├── Daily Challenge API                                   │
│  ├── Multiplayer (Race mode via WebSocket)                 │
│  ├── Anti-cheat validation                                 │
│  └── Reuses parent's Auth middleware                       │
└────────────────────────────────────────────────────────────┘
```

### Tech stack chốt

**Frontend**
- React 18 + TypeScript strict + Vite
- Tailwind CSS + shadcn/ui
- Zustand (state) + Framer Motion (animation)
- Socket.IO client (multiplayer)
- vite-plugin-pwa

**Backend**
- Node.js + Express (reuse parent portal codebase)
- Socket.IO (realtime)
- Database: dùng chung với parent portal (PostgreSQL/MySQL/MongoDB — tùy hiện tại)
- Redis (optional, cho leaderboard caching + matchmaking queue)
- JWT hoặc session cookie (tùy parent portal đang dùng gì)

---

## Chiến lược Subdomain & DNS

### Cấu trúc đề xuất

```
allin1site.com                      → Portal chính (landing, auth, user profile)
├── api.allin1site.com              → API chung (auth, user)
├── news.allin1site.com             → 24hHotnewsAI
├── games.allin1site.com            → Games hub page (list tất cả game)
│   ├── sudoku.games.allin1site.com → Sudoku (dự án này)
│   ├── caro.games.allin1site.com   → Caro
│   └── ...                         → Game khác thêm sau
└── admin.allin1site.com            → Admin panel
```

### Cookie & Auth scope

Cookie session được set ở domain `.allin1site.com` (có dấu chấm đầu) → **tự động share** cho tất cả subdomain:
- `news.allin1site.com` ✓
- `sudoku.games.allin1site.com` ✓ (multi-level vẫn OK)
- `admin.allin1site.com` ✓

→ User login 1 lần ở `allin1site.com`, vào game Sudoku là đã logged-in sẵn.

### SSL Certificates

Cần 2 wildcard certs từ Let's Encrypt (free):
1. `*.allin1site.com` — cho subdomain cấp 1
2. `*.games.allin1site.com` — cho game subdomains

Hoặc 1 cert multi-SAN có cả 2 wildcards (Let's Encrypt hỗ trợ).

### Lưu ý về folder name

Folder hiện tại là `Sodokugame` — có vẻ là typo (đúng phải là "Sudoku"). Em recommend rename thành `SudokuGame` cho professional. Nếu đã commit rồi thì:
```bash
git mv subapp/Sodokugame subapp/SudokuGame
```
Các path trong doc này em dùng tên folder hiện tại để khớp setup của anh. Nếu rename thì update lại.

---

## Portal Integration Strategy

### 1. Shared Authentication

**Yêu cầu từ parent portal** (anh/team portal cần provide):
- Endpoint `GET https://api.allin1site.com/auth/me` trả về user info nếu đã login, 401 nếu chưa
- Session cookie được set ở domain `.allin1site.com`
- CORS allow origin `https://sudoku.games.allin1site.com` với `credentials: true`

**Sudoku app side:**
- Tạo `src/lib/auth.ts` với `fetchCurrentUser()` gọi endpoint trên
- Tạo `useAuth()` hook cung cấp `{ user, isLoading, isAuthenticated, logout }`
- Protected features (leaderboard submit, multiplayer) require auth; guest vẫn chơi được solo offline

### 2. Shared Header/Footer

**Chiến lược (chọn 1):**

**Option A — NPM shared package** (nếu portal là monorepo):
- Tạo package `@allin1site/shared-ui` trong monorepo
- Export `<PortalHeader />`, `<PortalFooter />`, `<UserMenu />`
- Sudoku app import như bình thường

**Option B — Runtime fetch** (đơn giản, decoupled):
- Parent portal expose endpoint `GET /api/portal/shell` trả về `{ headerHtml, footerHtml, cssUrl }`
- Sudoku app fetch on mount, render vào slot cố định
- Cache trong memory/localStorage

**Option C — Web Components** (cleanest, cross-framework):
- Parent portal publish `<portal-header>` và `<portal-footer>` as custom elements qua CDN
- Sudoku app include `<script src="https://cdn.allin1site.com/shell/v1.js">`
- Dùng như HTML tag bình thường

Em recommend **Option A nếu là monorepo**, còn lại thì **Option C**. Trong doc này em default Option A, nếu setup khác anh bảo em sửa.

### 3. User data sync

Sudoku backend KHÔNG tạo user mới. Flow:
1. User login tại `allin1site.com` → có `user_id` ở portal
2. User vào Sudoku → frontend gửi request kèm cookie session
3. Sudoku backend verify cookie/JWT với parent (middleware `requireAuth`)
4. Middleware inject `req.user = { id, email, displayName, avatar }`
5. Sudoku backend tạo record `sudoku_profile` lần đầu với FK = portal user_id

---

## Phase 0 — Pre-flight Decisions

Trước khi chạy Phase 1, anh cần quyết định & xác nhận các điểm sau. Điền vào file `./docs/decisions.md` để làm tham chiếu cho các phase sau:

### Checklist quyết định

- [ ] **Subdomain cuối cùng**: `sudoku.games.allin1site.com` hay phương án khác?
- [ ] **Parent portal tech stack**: Express? Fastify? NestJS? Framework nào?
- [ ] **Database parent portal**: PostgreSQL? MySQL? MongoDB? (sẽ dùng cùng DB cho Sudoku tables)
- [ ] **Auth mechanism parent**: Session cookie? JWT? OAuth?
- [ ] **User ID type**: UUID? int? string?
- [ ] **Shared UI strategy**: Option A (npm package) / B (runtime fetch) / C (web components)?
- [ ] **Deployment target**: Nginx self-hosted? Cloudflare Pages? Vercel?
- [ ] **Folder rename**: Giữ `Sodokugame` hay đổi thành `SudokuGame`?

### File `docs/decisions.md` template

```markdown
# Project Decisions

## Domain
- Production URL: https://sudoku.games.allin1site.com
- Staging URL: https://sudoku-staging.games.allin1site.com
- Auth cookie domain: .allin1site.com

## Tech Stack Parent Portal
- Framework: <Express | ...>
- Database: <PostgreSQL | ...>
- Auth: <Session cookie | JWT | ...>
- User ID type: <uuid | int>

## Integration Strategy
- Shared UI: <A | B | C>
- Header/Footer source: <path to shared package or endpoint URL>

## Deployment
- Hosting: <Nginx | Cloudflare Pages | ...>
- CI/CD: <GitHub Actions | ...>
```

---

## Phase 1 — Project Setup & Design Tokens

> **Thời gian ước tính**: 15-20 phút
> **Prerequisites**: `./Design/` folder đã có output từ Claude Design; `docs/decisions.md` đã điền

### Prompt cho Claude Code

````markdown
# Phase 1/7: Project Setup & Design Token Extraction

## Working Directory
`E:\SourceCode\24hHotnewsAI\Crawler&Admin\server\app\portal\subapp\Sodokugame`

The `./Design/` subfolder contains UI mockups from Claude Design. Read them FIRST. The `./docs/decisions.md` file has my decisions on tech stack and domain.

## Tasks

### 1. Read context files
- Read all files in `./Design/` recursively
- Read `./docs/decisions.md`
- Output a summary of what you understood to `./docs/phase1-context.md`

### 2. Extract design tokens
Create `./DESIGN_TOKENS.md` listing:
- Color palette (light + dark) with hex values
- Typography (font families, sizes, weights, line-heights)
- Spacing scale
- Border radius values
- Shadow definitions
- Component patterns observed (buttons, cards, board cells and their states)

### 3. Scaffold the project
Initialize in the current directory (NOT a subfolder):
- Vite + React 18 + TypeScript (strict mode enabled)
- Tailwind CSS configured with tokens from DESIGN_TOKENS.md
- shadcn/ui with base components: Button, Dialog, Tabs, Card, Switch, AlertDialog, Toast
- ESLint + Prettier (standard React/TS config)
- Vitest + React Testing Library + happy-dom
- Path aliases: `@/` → `./src/`

Install dependencies:
- `zustand` + `immer` for state
- `framer-motion` for animations
- `lucide-react` for icons
- `clsx` + `tailwind-merge`
- `date-fns` for daily challenge seeding
- `socket.io-client` (Phase 7 prep, but install now)

### 4. Tailwind config
Map extracted tokens into `tailwind.config.js` `theme.extend`. Put CSS variables for light/dark in `src/index.css` using `:root` and `.dark` selectors.

### 5. Folder structure
```
src/
├── core/
│   ├── types.ts
│   ├── constants.ts
│   ├── generator.ts        (empty, Phase 2)
│   ├── solver.ts           (empty, Phase 2)
│   ├── validator.ts        (empty, Phase 2)
│   └── techniques/         (empty, Phase 2)
├── store/                  (empty, Phase 3)
├── components/
│   ├── ui/                 (shadcn components)
│   ├── board/              (empty, Phase 4)
│   ├── controls/           (empty, Phase 4)
│   ├── screens/            (empty, Phase 4)
│   └── shell/              (empty, Phase 4 — for portal header/footer integration)
├── lib/
│   ├── auth.ts             (empty, Phase 3)
│   ├── api.ts              (empty, Phase 7)
│   └── socket.ts           (empty, Phase 7)
├── hooks/
├── utils/
│   ├── cn.ts
│   └── format.ts
├── locales/
│   ├── vi.ts               (default Vietnamese strings)
│   ├── en.ts
│   └── ja.ts
├── App.tsx
├── main.tsx
└── index.css
```

### 6. Core types (`src/core/types.ts`)
- `CellValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null`
- `Board = CellValue[][]` (9x9)
- `Notes = Set<number>[][]`
- `CellPosition = { row: number; col: number }`
- `DifficultyLevel = 1 | 2 | 3 | 4 | 5`
- `Technique` enum: NAKED_SINGLE, HIDDEN_SINGLE, NAKED_PAIR, HIDDEN_PAIR, NAKED_TRIPLE, HIDDEN_TRIPLE, POINTING_PAIR, BOX_LINE_REDUCTION, X_WING, SWORDFISH, XY_WING
- `SolveStep`, `Puzzle`, `GameState`, `Move`, `GameStatus` ('playing' | 'paused' | 'won' | 'lost')
- `User = { id: string; email: string; displayName: string; avatarUrl?: string }` (from portal)
- `LeaderboardEntry`, `MatchState` (prep cho Phase 7)

### 7. Constants (`src/core/constants.ts`)
- `DIFFICULTY_CONFIG` mapping 1-5 → `{ name, nameVi, nameJa, clueRange, maxTechnique, color }`
- `BOARD_SIZE = 9`, `BOX_SIZE = 3`
- `DEFAULT_MISTAKE_LIMIT = 3`
- `KEYBOARD_SHORTCUTS`
- `PORTAL_CONFIG`:
  - `AUTH_ENDPOINT: 'https://api.allin1site.com/auth/me'`
  - `SHELL_ENDPOINT: 'https://api.allin1site.com/portal/shell'` (if Option B)
  - `BACKEND_BASE: 'https://api.allin1site.com/sudoku'` (Phase 7)

### 8. Vietnamese locale (`src/locales/vi.ts`)
Flat object with all UI strings. English and Japanese can stub with same keys but empty values for now.

### 9. Minimal App.tsx
- Renders centered "Sudoku" heading
- Theme toggle button (demonstrates dark mode works)
- Shows "Chưa đăng nhập" placeholder (no auth wiring yet)

## Checkpoint — Verify before Phase 2
1. `npm run dev` loads without errors, theme toggle works
2. `npm run build` succeeds
3. `npm run test` runs (zero tests OK)
4. Show `DESIGN_TOKENS.md`, `tailwind.config.js`, `src/index.css`
5. Confirm folder structure

Do NOT implement game logic, auth, or backend calls in this phase. Stop after checkpoint.
````

---

## Phase 2 — Core Sudoku Engine

> **Thời gian ước tính**: 30-45 phút
> **Prerequisites**: Phase 1 checkpoint passed

### Prompt cho Claude Code

````markdown
# Phase 2/7: Core Sudoku Engine

Working directory: same as Phase 1. Do NOT touch UI. Everything in this phase is pure TypeScript in `src/core/`, fully unit-tested.

## Tasks

### 1. Validator (`src/core/validator.ts`)
Pure functions:
- `isValidPlacement(board, row, col, value): boolean` — checks row/col/box
- `findConflicts(board, row, col, value): CellPosition[]`
- `isBoardComplete(board): boolean`
- `isBoardValid(board): boolean`
- `getCandidates(board, row, col): number[]`
- `getPeers(row, col): CellPosition[]` — 20 cells in same row/col/box
- `computeAllCandidates(board): Notes` — full candidate grid

### 2. Techniques (`src/core/techniques/`)
Each technique = pure function:
```ts
function findTechnique(board: Board, notes: Notes): TechniqueResult | null
```
Where `TechniqueResult = { cells, eliminations, placements, reason }`.

Implement each in its own file (in order):
- `nakedSingle.ts`
- `hiddenSingle.ts`
- `nakedPair.ts`
- `hiddenPair.ts`
- `nakedTriple.ts`
- `hiddenTriple.ts`
- `pointingPair.ts`
- `boxLineReduction.ts`
- `xWing.ts`
- `swordfish.ts`
- `xyWing.ts`

Create `techniques/index.ts`:
```ts
export const TECHNIQUES_BY_DIFFICULTY: TechniqueDefinition[] = [
  { id: 'NAKED_SINGLE', level: 1, find: findNakedSingle, nameVi: 'Ô duy nhất', nameEn: 'Naked Single' },
  // ... in ascending difficulty
];
```

### 3. Solver (`src/core/solver.ts`)
- `solveWithTechniques(board)`: iterates techniques in order, returns `{ solved, steps, hardestTechnique }`
- `solveWithBacktracking(board): Board | null` — brute-force fallback
- `countSolutions(board, limit = 2): number` — stops early at 2; critical for uniqueness
- `getNextSolveStep(board, notes): SolveStep | null` — for hint system

### 4. Generator (`src/core/generator.ts`)
- `generateFullSolution(seed?): Board` — backtracking with shuffled candidates
- `generatePuzzle(level, seed?): Puzzle`:
  - Generate full solution
  - Shuffle cell positions
  - Try removing each → run `countSolutions` → if still unique AND technique-solvable within level → keep removed
  - Stop when clue count hits target range
- Seeded PRNG: `mulberry32` (do NOT use `Math.random` directly — Daily Challenge needs reproducibility)

### 5. Puzzle Pool fallback (`src/core/puzzlePool.ts`)
Pre-generated JSON arrays of 50 puzzles per level. Generator uses pool if runtime gen exceeds 3s. Generate pool via `npm run generate:pool` script.

### 6. Tests (`src/core/__tests__/`)
**`validator.test.ts`** — conflicts, candidates, peers

**`techniques.test.ts`** — per technique:
- Known fixture puzzle requiring exactly this technique
- Assert cells/eliminations found

**`solver.test.ts`**:
- Solve 5 known puzzles per difficulty
- Assert hardest technique matches expected

**`generator.test.ts`**:
- Generate 20 puzzles per level
- Assert unique solution (via `countSolutions`)
- Assert clue count in range
- Assert hardest technique matches level
- Seeded: same seed → identical puzzle

### 7. Performance targets
- Level 1-3: under 500ms
- Level 4: under 2s
- Level 5: under 5s (or fallback to pool)

### 8. Demo script (`scripts/demo-generate.ts`)
Runs `generatePuzzle` for each level, prints: level, clue count, hardest technique, gen time, first 5 solve steps.

## Checkpoint — Verify before Phase 3
1. `npm run test` — ALL tests pass, paste summary
2. `npm run demo:generate` — paste output
3. No React/DOM imports in `src/core/` (grep check)
4. Show solve trace for a Level 3 puzzle (readable format)

Stop after checkpoint.
````

---

## Phase 3 — State Management

> **Thời gian ước tính**: 20-25 phút
> **Prerequisites**: Phase 2 checkpoint passed

### Prompt cho Claude Code

````markdown
# Phase 3/7: State Management (Zustand) + Auth Client

All logic pure; no UI components. Also setting up auth client skeleton.

## Tasks

### 1. Auth client (`src/lib/auth.ts`)
```ts
export async function fetchCurrentUser(): Promise<User | null>
export function logout(): Promise<void>  // calls portal logout endpoint
```
- Uses `fetch` with `credentials: 'include'` to send cookie
- Endpoint from `PORTAL_CONFIG.AUTH_ENDPOINT`
- Returns null on 401
- Throws on 5xx (caller handles)

### 2. Auth store (`src/store/authStore.ts`)
```ts
{
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}
```
- Call `fetchUser()` on app boot
- NOT persisted (user info comes from cookie each session)

### 3. Game store (`src/store/gameStore.ts`)
State:
```ts
{
  puzzle: Puzzle | null;
  board: Board;
  notes: Notes;
  selectedCell: CellPosition | null;
  moves: Move[];
  redoStack: Move[];
  mistakes: number;
  hintsUsed: number;
  elapsedSeconds: number;
  status: GameStatus;
  autoNotes: boolean;
  isTimerRunning: boolean;
  mode: 'solo' | 'daily' | 'race';  // race = multiplayer, handled in Phase 7
}
```

Actions:
- `newGame(level)`
- `loadPuzzle(puzzle)` — for Daily, shared links, or race
- `selectCell(pos)`
- `setCellValue(pos, value)` — validates, counts mistakes, pushes move, auto-removes related notes
- `toggleNote(pos, value)`
- `clearCell(pos)`
- `undo()` / `redo()`
- `requestHint()` — returns next SolveStep; increments hintsUsed
- `applyHint(step)`
- `pause()` / `resume()`
- `tick()` — timer increment
- `reset()`

Rules:
- `mistakes >= mistakeLimit` → status = 'lost'
- Board complete + valid → status = 'won', timer stops
- Auto-notes: recalculates on each move when ON

Persist with `zustand/middleware/persist` — current game survives reload.

### 4. Stats store (`src/store/statsStore.ts`)
Persisted:
```ts
{
  perLevel: Record<DifficultyLevel, {
    played, won, bestTimeSeconds, totalTimeSeconds,
    currentStreak, longestStreak, lastPlayedAt
  }>;
  achievements: Record<AchievementId, { unlockedAt: string } | null>;
  dailyChallenge: { lastCompletedDate, streak };
}
```

Actions:
- `recordWin(level, timeSeconds, mistakes, hintsUsed)`
- `recordLoss(level)`
- `recordDailyCompleted()`
- `getStats(level)` — derived with avgTime, winRate
- `resetStats()`

### 5. Settings store (`src/store/settingsStore.ts`)
Persisted:
```ts
{
  theme: 'system' | 'light' | 'dark';
  autoNotes: boolean;
  mistakeLimitEnabled: boolean;
  mistakeLimit: number;
  highlightSameNumber: boolean;
  highlightPeers: boolean;
  soundEnabled: boolean;
  zenMode: boolean;
  language: 'vi' | 'en' | 'ja';
}
```
Default language: `'vi'`.

### 6. Achievements (`src/core/achievements.ts`)
At minimum 8, each with `{ id, nameVi, nameEn, description, icon, check(stats, lastGame) }`:
- FIRST_WIN, FLAWLESS, SPEED_DEMON (Expert under 15min), NO_HINTS
- STREAK_3, STREAK_7, STREAK_30
- ALL_LEVELS, DAILY_7

Export `checkNewAchievements(stats, lastGame): AchievementId[]`.

### 7. Tests (`src/store/__tests__/`)
- `gameStore.test.ts`: newGame, setCellValue correct/wrong, undo/redo, win, loss, mistake counting
- `statsStore.test.ts`: best time, streak, achievement triggers
- `achievements.test.ts`: each achievement fires correctly
- `authStore.test.ts`: mock fetch, verify loading→authenticated flow

## Checkpoint — Verify before Phase 4
1. All tests pass
2. Run `scripts/test-store.ts`: new game → 5 moves → undo 2 → wrong value → assert mistakes=1
3. Show authStore behavior when endpoint returns 401 vs 200 (mock test output)

Do NOT start UI. Stop.
````

---

## Phase 4 — UI Components

> **Thời gian ước tính**: 60-90 phút
> **Prerequisites**: Phase 3 checkpoint passed, `./Design/` folder có đầy đủ mockups

### Prompt cho Claude Code

````markdown
# Phase 4/7: UI Components — Match Design folder exactly

## Mandatory first step
RE-READ all files in `./Design/` folder. `DESIGN_TOKENS.md` from Phase 1 is the source of truth. If the Design folder has screens in HTML/JSX/image, match layout, padding, radius, shadow, and interaction patterns precisely. Do NOT invent new visuals.

## Tasks

### 1. Portal Shell (`src/components/shell/`)
Implement based on Integration Strategy from `docs/decisions.md`:

**If Option A (npm shared package):**
- Import `<PortalHeader />`, `<PortalFooter />` from `@allin1site/shared-ui`
- Place them in `AppShell.tsx` wrapping main content

**If Option B (runtime fetch):**
- `src/lib/portalShell.ts` — `fetchShell(): Promise<{ headerHtml, footerHtml, cssUrl }>`
- `<PortalHeader />` component uses `dangerouslySetInnerHTML` after fetch
- Cache in sessionStorage for 5 minutes

**If Option C (web components):**
- Load `<script src="https://cdn.allin1site.com/shell/v1.js">` in `index.html`
- Use `<portal-header>`, `<portal-footer>` directly in JSX
- TypeScript declare for custom elements

Create `AppShell.tsx`:
```tsx
<div className="min-h-screen flex flex-col">
  <PortalHeader />
  <main className="flex-1">{children}</main>
  <PortalFooter />
</div>
```

### 2. Board (`src/components/board/`)

**`Cell.tsx`**
- Props: `{ row, col, value, notes, isGiven, isSelected, isPeer, isSameNumber, isConflict, isHintHighlight, onSelect }`
- Given number: bold dark; user number: accent color; empty with notes: 3x3 mini grid
- `memo` — re-render only on prop change
- Framer Motion: scale 1→1.12→1 on value change
- Red flash 200ms on conflict
- Tap target ≥ 44px mobile
- `aria-label` for screen readers

**`Board.tsx`**
- 9x9 grid with thick borders every 3 cells
- Reads state from `gameStore`
- Keyboard navigation: arrows move selection, 1-9 input, space toggles note mode, delete clears
- Respects `prefers-reduced-motion`
- Completion animation: row/col/box green wave

**`NumberPad.tsx`**
- 1-9 buttons with remaining count superscript
- Disabled/faded when count = 0
- Large tap targets

**`ActionBar.tsx`**
- Undo, Erase, Notes toggle (clear ON/OFF state), Hint (count used)
- Disabled states handled properly

### 3. Screens (`src/components/screens/`)

**`HomeScreen.tsx`**
- Portal shell already wraps it
- Continue card (conditional on saved game): shows level, progress %, time
- 5 Level cards: name, Japanese kanji subtitle, best time, icon, color-coded
- Daily Challenge card (with completion status)
- CTA buttons: Leaderboard (→ Phase 7), Multiplayer (→ Phase 7, disabled for now with tooltip "Coming soon")
- Bottom tabs (mobile only): Play / Stats / Settings

**`GameScreen.tsx`**
- Top bar: back, level name, timer, mistakes (0/3), pause
- Board centered
- NumberPad + ActionBar below
- Pause overlay: blur board + resume button
- Win modal / Loss modal triggers

**`StatsScreen.tsx`**
- Tabs per level + Overall
- Cards: played, win rate, best time, avg time, streak
- Last-10-games line chart (simple SVG, no chart library)
- Achievement grid: unlocked in color, locked grayed
- Global rank placeholder (Phase 7 will wire it)

**`SettingsScreen.tsx`**
- Theme: System/Light/Dark
- Toggles: auto-notes, mistake limit, highlight same number, highlight peers, sound, Zen mode
- Language selector (vi/en/ja)
- Account section: show user info (if authed) + logout button, or "Login at allin1site.com" link
- Reset stats (AlertDialog confirm)

### 4. Modals (`src/components/modals/`)
- `WinModal.tsx` — confetti, time, mistakes, hints, new achievements, "Play Again" / "Next Level" / "Share" / "Submit to Leaderboard" (latter disabled if not logged in, with login link)
- `LossModal.tsx` — "Hết lượt sai", retry, reveal solution
- `HintModal.tsx` — technique name (Vietnamese), explanation, highlighted cells, "Tự điền" / "Để tôi thử"
- `PauseOverlay.tsx` — blur + large resume button

### 5. Supporting

**`ThemeProvider.tsx`** — reads settings, applies `class="dark"` to html, listens system preference

**`useKeyboardShortcuts.ts`** — global: Ctrl+Z, Ctrl+Y, N, H, P, 1-9, arrows, Delete

**`useGameTimer.ts`** — tick every second when status === 'playing'

**`Confetti.tsx`** — subtle canvas-based, respects reduced-motion

**`useAuth.ts`** — hook wrapping authStore, provides `{ user, isAuthenticated, isLoading, logout }`

### 6. Routing
Simple state router in `App.tsx`:
```ts
type Screen = 'home' | 'game' | 'stats' | 'settings' | 'leaderboard';
```
(leaderboard placeholder for Phase 7)

Animate transitions with Framer Motion.

### 7. Vietnamese locale
Fill `src/locales/vi.ts` with all strings used in UI. Components import from locale, not hardcoded.

### 8. Responsive
- Mobile-first (375px baseline)
- Desktop: center board with side panels for number pad + action bar (landscape layout)
- Touch targets ≥ 44px on mobile

## Checkpoint — Verify before Phase 5
1. `npm run dev` — full flow: Home → level → play → win → home
2. Keyboard-only play works end-to-end
3. Dark mode works
4. Mobile viewport (375px) usable
5. Portal header/footer renders correctly (if logged in, shows user; if not, login link)
6. Describe each screen visually (or attach screenshots) for review
7. List any deviations from Design folder

Stop after checkpoint.
````

---

## Phase 5 — Advanced Features

> **Thời gian ước tính**: 45-60 phút
> **Prerequisites**: Phase 4 checkpoint passed

### Prompt cho Claude Code

````markdown
# Phase 5/7: Hint System, Daily Challenge, Share, PWA, Zen Mode

## Tasks

### 1. Smart Hint System (3 tiers)
Solver's SolveStep already available.

`HintModal.tsx` with tier escalation:
- **Tier 1**: "Có thể dùng kỹ thuật [Naked Single]" — just technique name
- **Tier 2**: "Hãy xem khối số [4]" — region hint
- **Tier 3**: Full explanation in Vietnamese + highlighted cells + "Tự điền" button

Technique name Vietnamese map in `src/locales/techniques.ts`:
```ts
{
  NAKED_SINGLE: { vi: 'Ô duy nhất', explanation: 'Ô này chỉ còn 1 số có thể điền...' },
  HIDDEN_SINGLE: { vi: 'Số duy nhất trong khối', explanation: '...' },
  // ...
}
```

User clicks "Gợi ý thêm" to escalate. Each cell counts once in hintsUsed regardless of tier.

### 2. Daily Challenge (`src/features/dailyChallenge.ts`)
- `getTodaySeed()`: UTC date `YYYY-MM-DD`
- `generateDailyPuzzle(date?)`: level rotates by day-of-week (Mon=1 Easy → Sun=5 Expert)
- Same seed → same puzzle globally
- Home card: shows date, level badge, completion status ✓, current daily streak
- Completing daily → `statsStore.recordDailyCompleted()`

**Phase 7 prep**: Daily challenge will have leaderboard. Design `submitDailyResult()` stub that logs to console for now — actual API in Phase 7.

### 3. Share Puzzle (`src/utils/puzzleCodec.ts`)
- `encodePuzzle(puzzle): string` — bit-packing: 81 cells × 4 bits = 324 bits → base64url (~55 chars)
- `decodePuzzle(code): Puzzle`
- Share button in WinModal: `https://sudoku.games.allin1site.com/?p=<code>`
- On app load, check `?p=` → offer to load puzzle
- Web Share API with clipboard fallback
- Support "Challenge friend": `?p=<code>&challenge=1&from=<userId>` — prompts friend's time after solve (Phase 7 wires it)

### 4. Sound Effects
Small tasteful sounds:
- Cell fill (soft click)
- Conflict (gentle buzz)
- Win (ascending chime)

Files in `src/assets/sounds/`. Preload on first user interaction. Respects `settings.soundEnabled`.

### 5. PWA Configuration (`vite-plugin-pwa`)
```js
{
  registerType: 'autoUpdate',
  manifest: {
    name: 'Sudoku - All In One',
    short_name: 'Sudoku',
    start_url: '/',
    display: 'standalone',
    theme_color: '<from tokens>',
    background_color: '<from tokens>',
    icons: [/* 192, 512, maskable */]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2}'],
    runtimeCaching: [
      // Cache portal shell fetch for 5min
      { urlPattern: /api\.allin1site\.com\/portal\/shell/, handler: 'StaleWhileRevalidate' }
    ]
  }
}
```

Install prompt: custom UI in Settings triggers `beforeinstallprompt`.

### 6. Zen Mode
When `settings.zenMode === true`:
- Hide timer
- Hide mistake counter (still validates silently)
- No loss state
- Stats recorded separately (don't count toward streak/best time)

### 7. Animations polish
- Board entry: staggered fade from top-left
- Number placement: scale bounce 1→1.12→1 over 180ms
- Row/col/box completion: green wave across unit
- Win: cells ripple outward, then confetti

All animations guarded by `prefers-reduced-motion`.

### 8. Error boundaries
Wrap `<App>` with `<ErrorBoundary>` showing friendly Vietnamese error + "Báo lỗi" (copy error to clipboard or mailto link).

## Checkpoint — Verify before Phase 6
1. Hint 3 tiers work end-to-end
2. Daily: 2 browser profiles same date → same puzzle
3. Share: encode → paste URL in new tab → puzzle loads
4. `npm run build && npm run preview` — DevTools Application tab shows: installable, service worker active, offline works
5. Zen mode hides timer/mistakes
6. All tests pass

Stop after checkpoint.
````

---

## Phase 6 — Build & Deploy

> **Thời gian ước tính**: 20-30 phút
> **Prerequisites**: Phase 5 checkpoint passed

### Prompt cho Claude Code

````markdown
# Phase 6/7: Build & Deploy — sudoku.games.allin1site.com

## Context
- Domain: `sudoku.games.allin1site.com`
- Auth cookie: `.allin1site.com` (shared)
- CORS origin must allow `https://sudoku.games.allin1site.com`
- Parent portal serves auth API at `https://api.allin1site.com`

## Tasks

### 1. Vite production config
Update `vite.config.ts`:
- `base: '/'`
- `build.outDir: 'dist'`
- `build.sourcemap: false`
- Manual chunks:
  - `vendor-react`: react, react-dom
  - `vendor-motion`: framer-motion
  - `vendor-state`: zustand, immer
  - `core`: `/src/core/*`
- Asset hashing enabled
- Target: `es2020`

### 2. Environment config
`.env.production`:
```
VITE_APP_URL=https://sudoku.games.allin1site.com
VITE_APP_NAME=Sudoku
VITE_AUTH_ENDPOINT=https://api.allin1site.com/auth/me
VITE_SHELL_ENDPOINT=https://api.allin1site.com/portal/shell
VITE_SUDOKU_API=https://api.allin1site.com/sudoku
VITE_SUDOKU_WS=wss://api.allin1site.com/sudoku
```

`.env.development`:
```
VITE_APP_URL=http://localhost:5173
VITE_AUTH_ENDPOINT=http://localhost:3000/auth/me
# ... (mirror local dev backend)
```

Update `src/core/constants.ts` to read from `import.meta.env`.

### 3. Scripts (`package.json`)
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint src --ext ts,tsx",
    "typecheck": "tsc --noEmit",
    "analyze": "vite build --mode analyze",
    "generate:pool": "tsx scripts/generate-pool.ts"
  }
}
```

### 4. SPA routing support
- `public/_redirects` (Netlify/Cloudflare): `/* /index.html 200`
- `public/404.html` (GitHub Pages): copy of index.html
- `public/web.config` (IIS): URL rewrite to `/index.html`

### 5. Deployment docs (`DEPLOY.md`)
Comprehensive guide with 3 options:

**Option A — Nginx self-hosted**

```nginx
# /etc/nginx/sites-available/sudoku.games.allin1site.com
server {
  listen 443 ssl http2;
  server_name sudoku.games.allin1site.com;

  ssl_certificate /etc/letsencrypt/live/games.allin1site.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/games.allin1site.com/privkey.pem;

  root /var/www/sudoku/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location ~ ^/(index\.html|sw\.js|manifest\.webmanifest)$ {
    add_header Cache-Control "no-cache";
  }

  gzip on;
  gzip_types application/javascript application/json text/css image/svg+xml;
  gzip_min_length 1000;
}

# HTTP → HTTPS redirect
server {
  listen 80;
  server_name sudoku.games.allin1site.com;
  return 301 https://$server_name$request_uri;
}
```

**Option B — Integrate with parent Node/Express portal**

```js
// In parent portal server (something like portal/server.js)
const path = require('path');
const express = require('express');
const vhost = require('vhost');

const sudokuApp = express();
const sudokuDist = path.join(__dirname, 'app/portal/subapp/Sodokugame/dist');

sudokuApp.use(express.static(sudokuDist, { maxAge: '1y', immutable: true }));
sudokuApp.get('*', (req, res) => res.sendFile(path.join(sudokuDist, 'index.html')));

// Vhost dispatches by subdomain
app.use(vhost('sudoku.games.allin1site.com', sudokuApp));
```

**Option C — Cloudflare Pages / Vercel**
- Point `sudoku.games.allin1site.com` via CNAME
- Build command: `npm run build`
- Output: `dist`
- Set env vars in dashboard

### 6. README.md (Vietnamese)
Sections:
- Giới thiệu
- Tech stack
- Cấu trúc thư mục
- Scripts
- Kiến trúc (core/store/components/lib)
- Game features
- Difficulty levels (5-row table)
- Portal integration notes
- Deploy (link to DEPLOY.md)
- Phase 7 backend (link to BACKEND.md)

### 7. ARCHITECTURE.md
Explain:
- Generator/solver design rationale
- Why Zustand, persistence strategy
- Portal integration pattern chosen
- PWA caching strategy

### 8. Final verification
- `npm run typecheck` — zero errors
- `npm run lint` — zero errors
- `npm run test:run` — all pass, show coverage
- `npm run build` — succeeds, show `dist/` size
- `npm run preview` — verify:
  - Home loads
  - All 5 levels playable
  - Daily works
  - Offline works
  - Share link round-trips
  - PWA installable
  - Portal header/footer renders (with mock or real endpoint)

### 9. Bundle size targets
- Initial JS gzipped: ≤ 180KB (increased from 150KB to account for socket.io-client)
- Initial CSS gzipped: ≤ 20KB
- Total app shell gzipped: ≤ 230KB

If exceeded, `npm run analyze` and identify offenders.

## Final deliverables
1. `dist/` production build
2. `README.md` (Vietnamese)
3. `DEPLOY.md` (3 options)
4. `ARCHITECTURE.md`
5. Test suite passing
6. Known limitations list

## Report back
- Bundle size breakdown
- Test coverage %
- Feature checklist vs scope
- Tech debt / compromises
- Phase 7 readiness (API contract ready? WebSocket endpoints defined?)
````

---

## Phase 7 — Backend: Leaderboard & Multiplayer

> **Thời gian ước tính**: 2-3 tiếng (phase lớn nhất, nên chia nhỏ nếu cần)
> **Prerequisites**: Phase 6 hoàn thành, parent portal đã có auth middleware, database connection sẵn

Phase này chia thành **3 sub-phases** để dễ quản lý:
- **7A**: Foundation + Leaderboard API
- **7B**: Multiplayer (Race mode) với WebSocket
- **7C**: Async Challenge + Tournament + Anti-cheat hardening

### Tổng quan kiến trúc Backend

```
Parent Portal Server (Express)
├── /auth/*              (existing — reuse)
├── /portal/*            (existing)
└── /sudoku/             (NEW — this phase)
    ├── api/
    │   ├── GET  /leaderboard/:level      → Global top 100
    │   ├── GET  /leaderboard/daily/:date → Daily leaderboard
    │   ├── GET  /leaderboard/me          → User's rank per level
    │   ├── POST /scores                  → Submit game result (w/ anti-cheat)
    │   ├── GET  /me/stats                → Server-side stats
    │   ├── GET  /me/history              → Last 50 games
    │   ├── POST /daily/submit            → Submit daily result
    │   ├── GET  /friends                 → Friend list with stats
    │   ├── POST /friends/request         → Add friend
    │   ├── POST /challenges              → Send async challenge
    │   └── GET  /challenges/incoming     → Pending challenges
    └── ws/
        ├── match:create                  → Create race room
        ├── match:join                    → Join by code
        ├── match:ready                   → Mark ready
        ├── match:move                    → Broadcast move
        ├── match:complete                → Finished solving
        └── match:leave
```

### Database Schema (PostgreSQL example)

```sql
-- Link Sudoku profile to parent portal user
CREATE TABLE sudoku_profiles (
  user_id UUID PRIMARY KEY REFERENCES portal_users(id) ON DELETE CASCADE,
  display_name VARCHAR(50) NOT NULL,  -- may differ from portal displayName
  avatar_url TEXT,
  total_score INT DEFAULT 0,          -- ELO-like composite
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Every completed game
CREATE TABLE sudoku_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES sudoku_profiles(user_id),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
  puzzle_seed TEXT,                    -- NULL for freeplay, set for daily/challenge
  time_seconds INT NOT NULL,
  mistakes SMALLINT NOT NULL,
  hints_used SMALLINT NOT NULL,
  was_flawless BOOLEAN GENERATED ALWAYS AS (mistakes = 0 AND hints_used = 0) STORED,
  mode VARCHAR(20) NOT NULL,           -- 'solo' | 'daily' | 'race' | 'challenge'
  match_id UUID,                       -- if race
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Anti-cheat audit trail
  client_move_count INT,
  client_ip INET,
  suspicious_flags TEXT[]              -- ['too_fast', 'impossible_move_rate', ...]
);
CREATE INDEX idx_scores_level_time ON sudoku_scores(level, time_seconds) WHERE mistakes = 0;
CREATE INDEX idx_scores_user ON sudoku_scores(user_id, created_at DESC);

-- Daily challenge submissions (1 per user per day)
CREATE TABLE sudoku_daily_submissions (
  user_id UUID NOT NULL REFERENCES sudoku_profiles(user_id),
  challenge_date DATE NOT NULL,
  score_id BIGINT REFERENCES sudoku_scores(id),
  time_seconds INT NOT NULL,
  rank INT,                            -- computed post-submit
  PRIMARY KEY (user_id, challenge_date)
);
CREATE INDEX idx_daily_date_time ON sudoku_daily_submissions(challenge_date, time_seconds);

-- Race matches
CREATE TABLE sudoku_matches (
  id UUID PRIMARY KEY,
  room_code VARCHAR(8) UNIQUE NOT NULL,   -- human-shareable
  level SMALLINT NOT NULL,
  puzzle_seed TEXT NOT NULL,
  puzzle_board JSONB NOT NULL,
  puzzle_solution JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,            -- 'waiting' | 'active' | 'finished' | 'abandoned'
  max_players SMALLINT DEFAULT 4,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  winner_user_id UUID REFERENCES sudoku_profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sudoku_match_participants (
  match_id UUID REFERENCES sudoku_matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES sudoku_profiles(user_id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  ready BOOLEAN DEFAULT FALSE,
  finish_time_seconds INT,
  finish_rank SMALLINT,
  mistakes SMALLINT,
  PRIMARY KEY (match_id, user_id)
);

-- Async challenges (friend sends puzzle to friend)
CREATE TABLE sudoku_challenges (
  id UUID PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES sudoku_profiles(user_id),
  to_user_id UUID NOT NULL REFERENCES sudoku_profiles(user_id),
  level SMALLINT NOT NULL,
  puzzle_seed TEXT NOT NULL,
  from_time_seconds INT NOT NULL,
  to_time_seconds INT,
  status VARCHAR(20) DEFAULT 'pending',   -- 'pending' | 'accepted' | 'completed' | 'expired'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friends (mutual)
CREATE TABLE sudoku_friends (
  user_id UUID REFERENCES sudoku_profiles(user_id),
  friend_id UUID REFERENCES sudoku_profiles(user_id),
  status VARCHAR(20) DEFAULT 'pending',   -- 'pending' | 'accepted' | 'blocked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)
);
```

---

### Phase 7A — Foundation + Leaderboard API

````markdown
# Phase 7A/7: Backend Foundation + Leaderboard API

## Context
- Parent portal: Express + (PostgreSQL/MySQL from decisions.md)
- Auth middleware `requireAuth` already exists, injects `req.user = { id, email, displayName }`
- Need to add Sudoku routes to parent portal codebase

## Working Directory
Parent portal server. The Sudoku frontend is in `subapp/Sodokugame`; backend routes go into the main portal's routes folder (path provided per portal setup).

Assume routes folder: `<portal>/routes/sudoku/` — adjust if different.

## Tasks

### 1. Database migration
Create migration file (Knex/Prisma/Sequelize — match parent portal's ORM):

Apply the schema from ARCHITECTURE doc:
- `sudoku_profiles`
- `sudoku_scores`
- `sudoku_daily_submissions`
- `sudoku_matches`
- `sudoku_match_participants`
- `sudoku_challenges`
- `sudoku_friends`

Include all indexes.

### 2. Shared validator (`shared/sudoku-core`)
We need the solver/validator ON SERVER too for anti-cheat. Options:
- **Option 1**: Publish `sudoku-core` as npm package from the frontend repo, consume in backend
- **Option 2**: Duplicate core/ into backend (simple, tolerable if stable)
- **Option 3**: Monorepo with shared package (best long-term)

For Phase 7A: copy `src/core/` from Sudoku frontend to `<portal>/shared/sudoku-core/` (Option 2). Document a TODO to convert to shared package.

Verify by running same tests in backend context.

### 3. Profile auto-creation middleware
```js
// middleware/ensureSudokuProfile.js
async function ensureSudokuProfile(req, res, next) {
  const profile = await db.sudoku_profiles.findOne({ user_id: req.user.id });
  if (!profile) {
    await db.sudoku_profiles.insert({
      user_id: req.user.id,
      display_name: req.user.displayName || req.user.email.split('@')[0],
      avatar_url: req.user.avatarUrl
    });
  }
  next();
}
```
Apply after `requireAuth` to all `/sudoku/*` routes.

### 4. Score submission endpoint (core of anti-cheat)
```
POST /sudoku/api/scores
Body: {
  level, puzzle_seed, time_seconds, mistakes, hints_used, mode,
  final_board, move_log: [{ pos, value, timestamp, type: 'place'|'note'|'erase' }]
}
```

Anti-cheat pipeline (in order; each can flag but not all reject):
1. **Auth & rate limit**: max 20 submissions per hour per user
2. **Puzzle integrity**: if `puzzle_seed` provided, regenerate puzzle server-side and verify `final_board` matches solution
3. **Minimum time check**: per level, define absolute minimum solve time:
   - L1: 30s, L2: 60s, L3: 120s, L4: 240s, L5: 420s
   - Below min → flag `too_fast` but still record (with flag)
4. **Move rate sanity**: `move_log.length / time_seconds` — if > 10 moves/sec → flag `impossible_move_rate`
5. **Move validity**: replay move_log on initial board, verify final state matches submitted `final_board`
6. **Duplicate submission**: same (user, puzzle_seed, time_seconds) within 1 minute → reject as duplicate

Return:
```json
{
  "score_id": "...",
  "rank_global": 42,
  "rank_percentile": 12,
  "new_best": true,
  "achievements_unlocked": ["FLAWLESS"],
  "flags": []
}
```

If flags present, submission stored but not shown in public leaderboard.

### 5. Leaderboard endpoints

**`GET /sudoku/api/leaderboard/:level?period=all|week|day&limit=100`**
```sql
SELECT p.display_name, p.avatar_url, s.time_seconds, s.was_flawless, s.created_at
FROM sudoku_scores s
JOIN sudoku_profiles p ON p.user_id = s.user_id
WHERE s.level = $1
  AND s.mistakes = 0
  AND s.suspicious_flags IS NULL OR cardinality(s.suspicious_flags) = 0
  AND ($period filter)
ORDER BY s.time_seconds ASC
LIMIT $limit;
```

Window by period:
- `all`: no filter
- `week`: `created_at >= NOW() - INTERVAL '7 days'`
- `day`: `created_at >= CURRENT_DATE`

Pick best score per user (distinct on user_id).

Cache in Redis with TTL 60 seconds.

**`GET /sudoku/api/leaderboard/daily/:date`**
```sql
SELECT p.display_name, p.avatar_url, d.time_seconds, d.rank
FROM sudoku_daily_submissions d
JOIN sudoku_profiles p ON p.user_id = d.user_id
WHERE d.challenge_date = $1
ORDER BY d.time_seconds ASC
LIMIT 100;
```

**`GET /sudoku/api/leaderboard/me`**
Returns user's rank for each level + current streak position.

**`POST /sudoku/api/daily/submit`**
Like score submission but with daily-specific logic:
- 1 per user per date (enforce via PK)
- Computed rank after insert
- Returns rank among daily participants

### 6. Personal endpoints

**`GET /sudoku/api/me/stats`**
Aggregates from `sudoku_scores` server-side (authoritative stats):
```json
{
  "per_level": { "1": { played, won, best_time, avg_time, win_rate }, ... },
  "total_played": ...,
  "total_time_seconds": ...,
  "achievements": [...],
  "current_streak_days": ...,
  "longest_streak_days": ...
}
```

**`GET /sudoku/api/me/history?limit=50`**
Last 50 games for user.

### 7. Frontend integration (`subapp/Sodokugame/src/lib/api.ts`)
Create typed client:
```ts
export const sudokuApi = {
  submitScore(params): Promise<SubmitScoreResponse>,
  getLeaderboard(level, period): Promise<LeaderboardEntry[]>,
  getDailyLeaderboard(date): Promise<DailyLeaderboardEntry[]>,
  getMyStats(): Promise<ServerStats>,
  getMyHistory(limit?): Promise<GameHistoryEntry[]>,
  getMyRank(): Promise<MyRankData>
};
```

All calls use `credentials: 'include'` for cookie auth. Handle 401 → redirect to login.

### 8. LeaderboardScreen (`src/components/screens/LeaderboardScreen.tsx`)
- Tabs: All Time / This Week / Today / Daily Challenge
- Level filter (1-5)
- Rank list with avatar, display name, time, flawless badge, relative date
- User's own rank highlighted
- Pagination or infinite scroll (100 per page)
- "Not logged in" empty state with login link

### 9. Wire into existing UI
- Update `WinModal`: show server rank after submission, achievement unlocks from server
- Update `StatsScreen`: pull from server when authenticated; fallback to local stats if guest
- Home screen: add "Xem bảng xếp hạng" button → LeaderboardScreen
- Navigation: add leaderboard tab

### 10. Tests
Backend:
- Unit tests for anti-cheat checks (each flag triggers correctly)
- Integration tests for leaderboard queries
- Migration rollback test

Frontend:
- api.ts mocked responses
- LeaderboardScreen rendering with various states (loading, empty, populated, error)

## Checkpoint — Verify before Phase 7B
1. Backend migrations run successfully
2. Can submit valid score → appears in leaderboard
3. Submit impossible-fast solve → gets flagged, NOT in leaderboard
4. Daily submission works, 2nd submission same day rejected
5. Frontend LeaderboardScreen loads and displays
6. User rank shows correctly

Stop after 7A checkpoint.
````

---

### Phase 7B — Multiplayer Race Mode (WebSocket)

````markdown
# Phase 7B/7: Multiplayer Race Mode via Socket.IO

## Overview
Real-time race: 2-4 players solve the same puzzle simultaneously. First to finish wins. Opponents' progress visible as % completion.

## Tasks

### 1. Socket.IO server setup
In parent portal server:
```js
const { Server } = require('socket.io');
const io = new Server(httpServer, {
  cors: {
    origin: ['https://sudoku.games.allin1site.com', 'http://localhost:5173'],
    credentials: true
  },
  path: '/sudoku/socket.io'
});

// Auth handshake: reuse cookie-based session
io.use(async (socket, next) => {
  const user = await authenticateFromCookie(socket.handshake.headers.cookie);
  if (!user) return next(new Error('unauthorized'));
  socket.data.user = user;
  await ensureSudokuProfile(user.id);
  next();
});
```

### 2. Match lifecycle

**Room states**: `waiting` → `countdown` → `active` → `finished`

**Events (client → server):**
- `match:create` `{ level }` → creates match, returns `{ matchId, roomCode }`
- `match:join` `{ roomCode }` → adds participant
- `match:ready` → mark self ready; when all ready, server starts countdown
- `match:move` `{ progress: 0-100 }` → throttled to 2/sec, broadcast to room
- `match:complete` `{ time_seconds, final_board, move_log }` → finish; server validates + updates match
- `match:leave`

**Events (server → client):**
- `match:state` — full current state on join/change
- `match:participant_joined` / `match:participant_left`
- `match:countdown` `{ seconds: 3 | 2 | 1 | 0 }`
- `match:started` `{ puzzle, solution_hash }` — everyone receives same puzzle
- `match:progress` `{ userId, progress }` — broadcast moves
- `match:finished` `{ userId, time_seconds, rank }`
- `match:ended` `{ results: [...], winner }` — fires when all done or timeout

### 3. Match module (`<portal>/modules/sudoku/match.js`)
```js
class MatchManager {
  async create(userId, level) {
    const seed = generateSeed();
    const { puzzle, solution } = generatePuzzle(level, seed);
    const match = await db.sudoku_matches.insert({
      id: uuid(), room_code: shortCode(6), level, 
      puzzle_seed: seed, puzzle_board: puzzle, puzzle_solution: solution,
      status: 'waiting'
    });
    await this.addParticipant(match.id, userId);
    return match;
  }
  async join(userId, roomCode) { /* ... */ }
  async setReady(userId, matchId) { /* check all ready → startCountdown */ }
  async startCountdown(matchId) { /* 3-2-1 emit, then start */ }
  async start(matchId) { /* emit match:started with puzzle */ }
  async recordFinish(userId, matchId, result) {
    // validate result (anti-cheat)
    // update participant record
    // if all finished → finalize match
  }
  async finalize(matchId) { /* compute ranks, insert sudoku_scores, emit match:ended */ }
  async leave(userId, matchId) { /* handle mid-game disconnection */ }
}
```

Use Redis for in-memory match state (fast), DB as source of truth on state changes.

Timeout: if match runs > 30 minutes, auto-finalize with "timeout" status.

### 4. Anti-cheat for race mode
Same pipeline as solo, plus:
- **Synchronous start check**: participant finish time must be ≥ server-known start time + min_solve_time
- **Progress plausibility**: if client reports 100% but move_log doesn't support it, reject
- **Disconnect exploit prevention**: disconnecting during race counts as abandonment, not retry

### 5. Frontend socket client (`src/lib/socket.ts`)
```ts
export class SudokuSocket {
  private socket: Socket;
  connect(): void;
  disconnect(): void;
  createMatch(level): Promise<{ matchId, roomCode }>;
  joinMatch(roomCode): Promise<MatchState>;
  markReady(): void;
  sendProgress(progress: number): void;  // throttled
  finishMatch(result): Promise<void>;
  leaveMatch(): void;
  
  // Event subscriptions
  onStateChange(cb): Unsubscribe;
  onCountdown(cb): Unsubscribe;
  onStarted(cb): Unsubscribe;
  onProgress(cb): Unsubscribe;
  onFinished(cb): Unsubscribe;
  onEnded(cb): Unsubscribe;
}
```

### 6. Match store (`src/store/matchStore.ts`)
```ts
{
  matchId: string | null;
  roomCode: string | null;
  status: 'idle' | 'waiting' | 'countdown' | 'active' | 'finished';
  participants: MatchParticipant[];
  countdown: number | null;
  progressMap: Record<userId, number>;  // 0-100 per player
  result: MatchResult | null;
  // actions
  createMatch, joinMatch, markReady, leaveMatch, updateProgress
}
```

### 7. UI components

**`MultiplayerLobbyScreen.tsx`**
- "Create Race" — select level, creates room, shows room code to share
- "Join Race" — input room code
- Room view: participant list with ready status, "Ready" button
- Countdown overlay when all ready

**`RaceGameScreen.tsx`**
- Normal board + NumberPad + ActionBar
- **Side panel**: participant list with progress bars (live updating)
- Timer in top bar
- On finish: "You finished X of N!" — continue watching others or go to results

**`RaceResultsModal.tsx`**
- Final rankings with times
- Winner highlighted with crown
- "Rematch" / "Back to lobby"

### 8. Integration
- Home screen: add "Đua cùng bạn bè" card (disabled if not logged in)
- Game store: add `mode: 'race'` handling — on `setCellValue`, calculate progress % (filled user cells / total empty), call `socket.sendProgress(progress)` throttled

### 9. Tests
Backend:
- Match creation, join by code, ready flow, start
- Disconnect handling (graceful leave vs abandon)
- Anti-cheat: race results validated same as solo
- Concurrent matches don't interfere

Frontend:
- socket.ts mock server (use `socket.io-mock`)
- MatchStore state transitions
- MultiplayerLobbyScreen ready flow
- Progress updates reflected in UI

## Checkpoint — Verify before Phase 7C
1. 2 browsers (different accounts) can create + join + race
2. Progress bars update in realtime
3. First finisher sees correct rank; others continue
4. All-finished triggers results modal
5. Disconnected player properly removed
6. Anti-cheat: submitting impossible race time → flagged

Stop after 7B checkpoint.
````

---

### Phase 7C — Async Challenge + Tournament + Hardening

````markdown
# Phase 7C/7: Async Challenges, Tournament, Friends, Anti-cheat Hardening

## Tasks

### 1. Friends system

**API:**
- `GET /sudoku/api/friends` — list with status + their stats
- `POST /sudoku/api/friends/request` `{ email | user_id }` — send request
- `POST /sudoku/api/friends/accept/:id`
- `DELETE /sudoku/api/friends/:id`
- `GET /sudoku/api/friends/leaderboard/:level` — only friends, ordered

**UI:**
- `FriendsScreen.tsx` with tabs: Friends / Requests / Find
- Add friend by email or display name search (debounced)
- Friend leaderboard mode on LeaderboardScreen

### 2. Async challenge

**Flow:**
1. User A finishes a puzzle → "Thách thức bạn bè" button → pick friend from list
2. Challenge record created; friend receives notification on next login
3. Friend plays the same puzzle (same seed) → sees A's time as ghost timer
4. On B finish → both get notification with comparison
5. Results become part of friend rivalry stats

**API:**
- `POST /sudoku/api/challenges` `{ to_user_id, puzzle_seed, level, from_time_seconds }`
- `GET /sudoku/api/challenges/incoming` — pending for me
- `GET /sudoku/api/challenges/sent` — my sent
- `POST /sudoku/api/challenges/:id/accept` — starts the challenge (mark accepted)
- `POST /sudoku/api/challenges/:id/complete` `{ time_seconds, final_board, move_log }`

**UI:**
- Challenge indicator in header (red dot on icon)
- `ChallengesScreen.tsx` — list with "Start challenge" buttons
- During play: small "Đang thách đấu: @friendname, thời gian cần vượt: 3:42" bar
- Completion modal: side-by-side comparison, winner highlighted

### 3. Tournament (Daily Tournament)
All users who complete today's Daily Challenge compete:
- Real-time leaderboard (WebSocket push updates)
- At midnight UTC: winners announced, next tournament starts
- Top 10 get achievement badge "Daily Top 10 [DATE]"

**Additions:**
- Socket.IO room `daily:YYYY-MM-DD` auto-joined when user opens daily
- On submit, broadcast leaderboard update to room
- UI: live leaderboard pane in DailyScreen

### 4. Notifications
Simple in-app notification system (no push):
- `sudoku_notifications` table: `{ id, user_id, type, payload_json, read, created_at }`
- `GET /sudoku/api/notifications?unread=true`
- `POST /sudoku/api/notifications/:id/read`
- WebSocket event `notification:new` when user is connected
- Header shows unread count badge; dropdown shows recent 10

Notification types: `FRIEND_REQUEST`, `CHALLENGE_RECEIVED`, `CHALLENGE_COMPLETED`, `ACHIEVEMENT_UNLOCKED`, `DAILY_RANK_FINAL`

### 5. Anti-cheat hardening

**Add server-side solution hashing:**
- Frontend only receives `puzzle` (the given cells), NOT `solution`
- Solution hash (SHA-256 of serialized board) sent with puzzle for verification client-side
- On submit, server verifies `final_board` matches stored solution
- This prevents client-side solution extraction

**Move log compression & verification:**
- Require move_log for all submitted scores
- Server replays from initial → final, must match exactly
- Reject if replay mismatches (tampered log)

**Behavior fingerprinting:**
- Collect subtle metrics: keystroke/click interval stats, time between moves
- Flag if user's interval distribution is suspiciously uniform (bot-like)
- Log but don't auto-ban; admin reviews flagged accounts

**Rate limiting:**
- Per endpoint: `POST /scores` 20/hour, `POST /daily/submit` 1/day
- Per user: 1 active race match at a time
- Use Redis token bucket

**Admin dashboard (minimal):**
- `<portal>/admin/sudoku` — list flagged submissions
- Actions: invalidate score, shadow-ban user from leaderboards
- Read-only audit log of admin actions

### 6. Observability
- Structured logging with request_id correlation
- Metrics: submission rate, flag rate, avg response time, active WS connections
- Error tracking (Sentry or parent portal's existing solution)

### 7. Tests
- Async challenge full flow (send → accept → complete → comparison)
- Friend request accept/reject
- Daily tournament live updates
- Anti-cheat: all flag types trigger correctly
- Rate limiting: 21st submission in hour rejected

### 8. Documentation
Create `BACKEND.md` covering:
- Full API reference (all endpoints with request/response shapes)
- WebSocket event catalog
- Database schema with ERD diagram
- Anti-cheat policy and flag meanings
- Admin operations guide
- Load testing results (if performed)

## Phase 7 — Final Checkpoint
1. 2-player race full game from create → play → finish → results
2. Async challenge: User A sends, User B plays, both see comparison
3. Daily tournament: multiple submissions update live leaderboard
4. Friends system fully functional
5. All anti-cheat flags verified with synthetic attacks
6. Admin dashboard accessible, can flag/unflag
7. Load test: 100 concurrent races don't degrade
8. All tests pass (frontend + backend)

## Post-Phase 7 roadmap (future)
- Push notifications (web push API)
- Seasonal events (special puzzles, limited-time cosmetics)
- ELO ranking system for matchmaking
- Replay viewer (watch any game step by step)
- Tournaments with brackets
- Guild/team features
````

---

## Phụ lục

### A. Tổng hợp thời gian & độ phức tạp

| Phase | Tên | Thời gian | Độ khó | Có thể chia nhỏ? |
|-------|-----|-----------|--------|-----------------|
| 0 | Pre-flight Decisions | 30 phút | Easy | Không — làm thủ công |
| 1 | Project Setup | 15-20 phút | Easy | Không |
| 2 | Core Engine | 30-45 phút | Medium | Có (per technique) |
| 3 | State Management | 20-25 phút | Easy-Medium | Không |
| 4 | UI Components | 60-90 phút | Medium | Có (per screen) |
| 5 | Advanced Features | 45-60 phút | Medium | Có (per feature) |
| 6 | Build & Deploy | 20-30 phút | Easy | Không |
| 7A | Backend Foundation | 60-90 phút | Medium-Hard | Có |
| 7B | Multiplayer Race | 90-120 phút | Hard | Có |
| 7C | Challenge + Hardening | 90-120 phút | Hard | Có |

**Tổng**: ~10-14 giờ làm việc tập trung (không tính debug)

### B. Quy tắc vận hành quan trọng

1. **Commit sau mỗi phase**: `git commit -am "Phase X: <summary>"` để rollback được nếu lệch
2. **Nếu Claude Code gãy giữa phase**: chạy lại từ checkpoint cuối, không chạy lại cả phase
3. **Nếu mất context**: đính kèm `docs/decisions.md` + `DESIGN_TOKENS.md` + output checkpoint gần nhất ở đầu prompt
4. **Nếu bundle size vượt target ở Phase 6**: ưu tiên lazy-load MultiplayerLobbyScreen + LeaderboardScreen (chỉ load khi user cần)
5. **Anti-cheat false positive**: log flag nhưng cho user vẫn thấy score của mình; chỉ ẩn ở public leaderboard

### C. Troubleshooting thường gặp

**Q: Portal auth cookie không share sang subdomain?**
- Kiểm tra cookie có `Domain=.allin1site.com; Secure; SameSite=Lax` (không phải Strict)
- Kiểm tra CORS của auth endpoint: `Access-Control-Allow-Credentials: true` + `Access-Control-Allow-Origin` cụ thể (không wildcard)

**Q: WebSocket connection fail qua nginx?**
- Nginx config cần:
```nginx
location /sudoku/socket.io/ {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
}
```

**Q: Generator L5 chậm quá?**
- Fall back sang puzzle pool (đã include trong Phase 2)
- Pre-generate pool qua CI, serve từ `/public/puzzles/`

**Q: Daily Challenge khác nhau giữa user các timezone?**
- Dùng UTC date, không dùng local date
- Server authoritative: frontend hỏi `GET /sudoku/api/daily/today` để biết seed đúng

**Q: Multiplayer room code collision?**
- Use nanoid với alphabet đã loại các ký tự dễ nhầm (0/O, 1/l/I)
- Length 6 → 36^6 ≈ 2.1 tỷ combinations, xác suất collision cực thấp với active rooms

### D. Security checklist

- [ ] Auth endpoint CORS restrict tới `sudoku.games.allin1site.com` only
- [ ] Cookie `Secure + HttpOnly + SameSite=Lax`
- [ ] Rate limit tất cả `POST` endpoints
- [ ] Anti-cheat flags không tiết lộ cho client (để attacker không biết cách bypass)
- [ ] SQL injection: dùng parameterized queries (ORM handles)
- [ ] XSS: React tự escape, nhưng check `dangerouslySetInnerHTML` trong portal shell
- [ ] CSRF: SameSite cookie + origin check ở middleware
- [ ] WebSocket auth: verify cookie on handshake, tránh session fixation
- [ ] Admin endpoints: check role `admin` from portal user, not trust client
- [ ] Log: không log password/token, có sanitizer cho PII

### E. Performance targets (tổng thể)

| Metric | Target | Cách đo |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Bundle JS gzipped | < 180KB | `npm run analyze` |
| Bundle CSS gzipped | < 20KB | `npm run analyze` |
| Generator L1-3 | < 500ms | Phase 2 demo script |
| Generator L4 | < 2s | Phase 2 demo script |
| Generator L5 | < 5s (hoặc pool fallback) | Phase 2 demo script |
| Leaderboard query | < 100ms p95 | Backend metrics |
| Race match start latency | < 500ms | WS timing |
| Lighthouse PWA score | ≥ 90 | Lighthouse |

### F. Cleanup / Technical Debt tracking

Tạo file `TECH_DEBT.md` ở project root. Mỗi khi Claude Code take shortcut, ghi:
```markdown
## [PHASE X] Description
**What**: shortened description
**Why**: reason for compromise
**Impact**: what breaks/limits
**Resolution**: how to fix later
**Priority**: P0/P1/P2
```

Review trước mỗi release.

---

## Kết luận

Document này đã cover toàn bộ từ setup → deploy → backend multiplayer cho Sudoku game. Khi chạy, **luôn chạy theo thứ tự phase và không bỏ checkpoint** — checkpoint là cơ chế an toàn giúp phát hiện lệch sớm thay vì phải refactor lớn cuối phase.

Nếu cần điều chỉnh gì — mở rộng scope, cắt scope, đổi tech — cập nhật `docs/decisions.md` trước rồi mới chạy phase tương ứng.

Good luck, anh Mạnh!
