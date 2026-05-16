# Sodoku — Design Tokens

Extracted from the Phase 0 reference UI in `Design/styles/tokens.css`.
Mirrored into `src/index.css` (CSS custom properties) and surfaced as
Tailwind utility classes via `tailwind.config.js`. Phase 4 components
should ALWAYS reach for the semantic aliases (e.g. `bg-bg-elevated`,
`text-fg-muted`) rather than the raw `paper-N` / `ink-N` ramps so dark
mode swaps come for free.

## Color palette

All colors use **OKLCH** for perceptual consistency across themes.
Hex values are approximate; OKLCH wins on conflict.

### Warm-neutral ramp (page surfaces)

| Token       | OKLCH                       | Hex      | Use                |
|-------------|-----------------------------|----------|--------------------|
| `--paper-0` | `oklch(99.2% 0.006 80)`     | `#FBF9F5`| Page background    |
| `--paper-1` | `oklch(97.2% 0.010 82)`     | `#F5F1E8`| Card background    |
| `--paper-2` | `oklch(94.5% 0.014 82)`     | `#ECE5D4`| Subtle fill        |
| `--paper-3` | `oklch(89.0% 0.020 80)`     | `#DDD2B8`| Strong divider     |

### Wood ramp (board)

| Token         | OKLCH                       | Hex      | Use                  |
|---------------|-----------------------------|----------|----------------------|
| `--kaya-0`    | `oklch(88.0% 0.040 75)`     | `#E8D6B0`| Board cell highlight |
| `--kaya-1`    | `oklch(82.0% 0.050 70)`     | `#D8BE8C`| Board base           |
| `--kaya-2`    | `oklch(72.0% 0.055 65)`     | `#B89968`| Board shadow         |
| `--kaya-grid` | `oklch(55.0% 0.045 55)`     | `#7F6441`| Grid lines           |

### Warm-ink ramp (text)

| Token     | OKLCH                       | Hex      | Use            |
|-----------|-----------------------------|----------|----------------|
| `--ink-0` | `oklch(20.0% 0.012 55)`     | `#2A231C`| Primary text   |
| `--ink-1` | `oklch(35.0% 0.010 55)`     | `#4E4539`| Secondary text |
| `--ink-2` | `oklch(52.0% 0.008 55)`     | `#7B7267`| Muted text     |
| `--ink-3` | `oklch(70.0% 0.008 55)`     | `#ADA699`| Disabled / hint|

### Sumi accent (single bold accent)

| Token            | OKLCH                            | Hex     | Use                  |
|------------------|----------------------------------|---------|----------------------|
| `--sumi`         | `oklch(50.0% 0.145 30)`          | `#A63C28`| Primary accent      |
| `--sumi-hover`   | `oklch(45.0% 0.150 30)`          | `#94331F`| Hover state        |
| `--sumi-press`   | `oklch(40.0% 0.155 30)`          | `#7F2A18`| Pressed state      |
| `--sumi-ghost`   | `oklch(50.0% 0.145 30 / 0.10)`   | —       | Tinted fill         |
| `--sumi-ring`    | `oklch(50.0% 0.145 30 / 0.40)`   | —       | Focus ring         |

### Status

| Token    | Aliases    | Use            |
|----------|------------|----------------|
| `--win`  | green moss | won state      |
| `--loss` | sumi       | lost / mistake |
| `--draw` | ink-2      | neutral / draw |

### Semantic aliases (Tailwind utilities)

These are what components should reference. Both light + dark themes
remap them.

| Tailwind class    | Token            |
|-------------------|------------------|
| `bg-bg`           | `--bg` → paper-0 |
| `bg-bg-elevated`  | `--bg-elevated` → paper-1 |
| `bg-bg-sunken`    | `--bg-sunken` → paper-2 |
| `text-fg`         | `--fg` → ink-0   |
| `text-fg-muted`   | `--fg-muted` → ink-1 |
| `text-fg-subtle`  | `--fg-subtle` → ink-2 |
| `text-fg-disabled`| `--fg-disabled` → ink-3 |
| `bg-accent`       | `--accent` → sumi |
| `bg-accent-hover` | `--accent-hover` → sumi-hover |
| `bg-accent-press` | `--accent-press` → sumi-press |
| `bg-accent-ghost` | `--accent-ghost` → sumi-ghost |
| `border-border`   | `--border` → paper-3/0.8 |

## Typography

| Token           | Value                                    |
|-----------------|------------------------------------------|
| `--font-sans`   | Inter, system-ui                         |
| `--font-serif`  | Fraunces, Georgia                        |
| `--font-mono`   | JetBrains Mono, SF Mono                  |

Type scale (1.25 minor third, base 16px):

| Token        | Size |
|--------------|------|
| `--text-xs`  | 12px |
| `--text-sm`  | 13px |
| `--text-base`| 15px |
| `--text-md`  | 17px |
| `--text-lg`  | 20px |
| `--text-xl`  | 24px |
| `--text-2xl` | 32px |
| `--text-3xl` | 44px |
| `--text-4xl` | 64px |
| `--text-5xl` | 96px |

## Spacing — 4px grid

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-10` 48 · `--space-12` 64

## Border radius

`--radius-xs` 2 · `--radius-sm` 6 · `--radius-md` 10 · `--radius-lg` 14 · `--radius-full` 9999

→ Tailwind: `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-full`.

## Shadows (warm-brown-tinted)

| Token           | Use                                             |
|-----------------|-------------------------------------------------|
| `--shadow-1`    | tile lift                                       |
| `--shadow-2`    | card                                            |
| `--shadow-3`    | floating modal                                  |
| `--shadow-board`| board container                                 |
| `--shadow-stone`| individual stone (warm-brown, never neutral)    |

## Motion

| Token            | Value                                |
|------------------|--------------------------------------|
| `--ease-spring`  | `cubic-bezier(0.34, 1.56, 0.64, 1)`  |
| `--ease-standard`| `cubic-bezier(0.4, 0, 0.2, 1)`       |
| `--dur-fast`     | 150ms                                |
| `--dur-base`     | 220ms                                |
| `--dur-slow`     | 400ms                                |

`prefers-reduced-motion: reduce` collapses all durations to ≤120ms and
swaps spring → standard.
