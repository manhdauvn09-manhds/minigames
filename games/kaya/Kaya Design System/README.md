# Kaya — Design System

**Kaya** is a web-based Caro / Gomoku (five-in-a-row) game. The name comes from *kaya* (榧), the Japanese Torreya wood traditionally reserved for the finest Go boards — a quiet nod to the game's lineage, and a promise that the product treats the ritual of the game with the same seriousness.

The brand sits at the intersection of **traditional Japanese Go-ban craft** and **modern digital restraint**. Warm neutrals, physical textures, and a single confident accent — not the flat sterile palette of Material Design, not the skeuomorphic kitsch of old-school mobile games.

## Product surfaces

There is currently one product:

- **Kaya Web** — a browser-based single-player game against an AI bot at five difficulty levels (1–5). Desktop is the primary surface; mobile collapses to a stacked layout with a bottom drawer for controls.

## Source materials

This design system was created from a product brief only. There is **no existing codebase, Figma file, screenshots, or brand assets** to reference. Every decision in this system is new and should be treated as a v1 proposal — refine freely.

## Index

Top-level files:

- `README.md` — this file (context, content fundamentals, visual foundations, iconography)
- `colors_and_type.css` — color tokens + type scale + semantic CSS variables
- `SKILL.md` — Agent Skill manifest (for Claude Code / agents)
- `fonts/` — webfonts used in the system
- `assets/` — logos, icons, textures, illustrations
- `preview/` — design-system preview cards (the cards you see in the Design System tab)
- `ui_kits/web/` — the Kaya Web UI kit (board, stones, sidebars, modals, states)

See the **UI kit index** at `ui_kits/web/index.html` for an interactive walkthrough.

---

## CONTENT FUNDAMENTALS

Kaya's voice is **quiet, deliberate, and respectful of the player's intelligence**. The product is a game about patience and pattern; the copy should feel like it was written by someone who plays.

### Voice rules

- **Terse over chatty.** One sentence is almost always enough. Never two where one will do.
- **Second person, understated.** "Your move." not "It's your turn, player!" We address the player directly but never exclaim at them.
- **No hype words.** Avoid "Awesome!", "Great job!", "Amazing move!". The game respects the player enough not to flatter them.
- **Name the state, don't narrate it.** "Bot is thinking." not "The bot is carefully considering its next move…"
- **Sentence case everywhere.** Headings, buttons, labels — all sentence case. No Title Case. No ALL CAPS except in a single small-caps eyebrow style.
- **No emoji. Ever.** The system uses real iconography (Lucide) and typographic marks. Emoji would break the tone.
- **No exclamation marks in UI copy.** A single "." carries more weight.
- **Japanese terms are fine, sparingly.** *Tsumego*, *hoshi* (star point), *komi* — only where they actually fit. Never as decoration.

### Tone examples

| Context | ✅ Kaya | ❌ Not Kaya |
|---|---|---|
| Player's turn | "Your move." | "It's your turn! Make a move 🎯" |
| Bot thinking | "Bot is thinking." | "Bot is carefully analyzing…" |
| Win screen | "You won in 23 moves." | "🎉 Victory! Congratulations, champion!" |
| Loss screen | "Bot won." | "Oh no — you lost! Try again?" |
| Draw | "Drawn." | "It's a tie! Nobody wins 🤝" |
| Hint disabled | "Hints are available on level 1–2." | "Upgrade to pro to unlock hints!" |
| New Game confirm | "Start a new game?" | "Are you sure you want to abandon this game?" |
| Difficulty level 1 | "Casual. The bot plays loose." | "Easy mode — for beginners!" |
| Difficulty level 5 | "Ruthless. No mercy." | "EXPERT MODE 🔥🔥🔥" |

### Numbers and formatting

- Move counts: "23 moves", not "23 Moves" or "23 MOVES".
- Time: `MM:SS` monospace, e.g. `04:12`. No leading "0:" for hours unless needed.
- Scores: `W 12  ·  L 8  ·  D 2` — single-letter prefixes, interpunct separator.
- Level: `Level 3` in full. Never `Lv 3` or `Lvl 3`.

---

## VISUAL FOUNDATIONS

### Palette philosophy

**Warm neutrals as the bed, a single bold accent for interaction.**

The system uses a family of warm off-whites, paper-creams, and muted wood tones as the ambient palette. Against this bed sits **one** accent color — *sumi* (墨), a deep desaturated vermilion-red traditionally used for inkan seals. This is the only saturated color in the product. If you reach for a second accent, you're probably solving the wrong problem.

The dark theme is not "invert the light theme" — it is a separate palette modeled on a dimly-lit room with an oil lamp: deep warm browns, not cool grays.

### Typography

- **Fraunces** — serif, used only for the wordmark and for the large numeric displays on win/loss overlays. Optical-sized, with soft terminals.
- **Inter** — sans-serif, used for everything else: body copy, labels, buttons, lists.
- **JetBrains Mono** — monospace, used for the timer, coordinates, and move notation.

Note: Fraunces is used deliberately *sparingly*. Headings in sidebars and modals use Inter at 14px/600 with 0.04em tracking and small-caps feature. Fraunces is reserved for emotional moments (title, victory).

Type scale is modular (1.25 minor third). Line-height is generous — 1.5 for body, 1.15 for display.

### Backgrounds and texture

The board itself has a subtle **kaya-wood** texture: a very low-contrast warm noise with faint horizontal grain. It is NOT a photographic wood — it's a stylized, screen-native texture (SVG turbulence filter, low opacity). The rest of the UI is mostly flat warm neutral; the texture lives only on the board so it reads as the "physical object" within an otherwise digital frame.

No gradients anywhere except:
- A very faint vertical paper-shadow under the top edge of the board (2px, 4% opacity) to suggest the board sitting on a surface.
- A radial highlight on each stone to give it weight.

No repeating patterns, no blurred glass, no full-bleed hero images.

### Stones

Stones are the single most important visual element. They must feel like **objects**, not icons.

- **Black stone**: deep charcoal (#1A1613), not pure black. A subtle radial gradient from slightly-lighter top-left to darker bottom-right gives it roundness. A 1px outer shadow at 20% opacity seats it on the board. An inner 1px highlight at the top-left sells the ceramic feel.
- **White stone**: warm bone (#F5EFE4), not pure white. Same radial treatment, plus a slightly more pronounced specular highlight.
- **Colorblind-safe alternative**: a toggle in settings swaps white stones for a warm sand color with a concentric ring pattern, and black stones gain a central dot. This preserves the value contrast but adds a shape cue.
- **Size**: ~80% of the grid cell. Never fills it edge-to-edge.
- **Placement animation**: the stone drops in over 220ms with a spring ease (`cubic-bezier(0.34, 1.56, 0.64, 1)`), scaling from 1.15 → 1.0. A subtle shadow ripple pulses out (opacity 0.15 → 0, 400ms) to sell the impact. No sound is tied to visuals — audio is a separate concern.

### Animations and motion

- **Duration**: 150ms for state changes, 220ms for stone placement, 400ms for overlays.
- **Easing**: `cubic-bezier(0.34, 1.56, 0.64, 1)` (soft spring overshoot) for stones and reveals. `cubic-bezier(0.4, 0, 0.2, 1)` (material standard) for UI state.
- **Reduced motion**: all spring animations collapse to 80ms fades. Stone placement becomes a crossfade with no scale.
- **Never**: wobble, bounce-back, elastic scales above 1.1, rotating loaders, parallax.

### Hover and press states

- **Hover**: 6% darken on light backgrounds, 8% lighten on dark. No movement, no scale. A faint 1px ring appears on icon buttons (1px, `--fg-muted`, 0.4 opacity).
- **Press**: 12% darken, NO scale shrink. A stone-placement hover on the board shows a 40%-opacity ghost stone in the hovered cell.
- **Focus**: a 2px outer ring in `--accent` at 60% opacity, offset by 2px. Every interactive element has a visible focus ring — never `outline: none`.

### Borders, corners, shadows

- **Corner radii**: 2px (chips), 6px (buttons, inputs), 10px (cards, modals), 14px (the board container). Never fully round except for the stones themselves.
- **Borders**: 1px, `--fg-muted` at low opacity. Never 2px+ decorative borders.
- **Shadow system** (three levels):
  - `--shadow-1`: `0 1px 2px rgba(40, 30, 20, 0.06)` — resting buttons, chips
  - `--shadow-2`: `0 4px 12px rgba(40, 30, 20, 0.08), 0 1px 3px rgba(40, 30, 20, 0.06)` — cards, the board
  - `--shadow-3`: `0 16px 40px rgba(40, 30, 20, 0.14), 0 4px 12px rgba(40, 30, 20, 0.08)` — modals, overlays
- Shadows are always **warm** (brown-tinted), never neutral gray. This is a small thing that matters.
- No inner shadows anywhere.

### Layout

- **Grid**: the main game screen is a three-column CSS grid: `minmax(260px, 20%) 1fr minmax(260px, 20%)`, with the board centered and constrained to `min(60vh, 60vw)` so it's always square.
- **Spacing scale**: 4, 8, 12, 16, 20, 24, 32, 48, 64. No freehand pixel values.
- **Fixed elements**: none. The layout is a single screen; nothing is sticky.

### Transparency and blur

Used in exactly two places:
1. **Modal scrim**: `rgba(32, 24, 18, 0.5)` with `backdrop-filter: blur(6px)`.
2. **Bot-thinking indicator**: a faint pulsing overlay on the board (opacity 0.04) — no blur.

Nowhere else.

### Imagery

There is no photographic imagery in the product. The "image" is the board itself. If illustration is ever needed (empty states, onboarding), it should be line-based, single-color in the accent, and feel like a woodblock print.

### Cards

Cards are the primary container. They have:
- 10px radius
- 1px border in `--border` (very faint warm gray)
- `--shadow-1` at rest
- 16px or 20px internal padding
- NO hover lift unless they are clickable (then `--shadow-2` on hover, no translate)

---

## ICONOGRAPHY

### System

Kaya uses **[Lucide Icons](https://lucide.dev)** (stroke-based, 1.5px weight, 24px canvas) loaded from CDN. Lucide was chosen for its quiet geometry and even stroke weight, which sits well next to Inter and doesn't fight the board for attention.

> **Substitution flag**: no codebase was provided, so Lucide is a fresh choice, not a carry-over. If the engineering team prefers a different set (Phosphor, Heroicons, Tabler), swap — Lucide is not load-bearing.

**CDN**: `https://unpkg.com/lucide@latest` (or `lucide-react` on npm for production)

### Usage rules

- **Size**: 16px (inline), 20px (buttons), 24px (toolbars). Never 18px or 22px.
- **Stroke**: 1.5px, matches Lucide's default. Never thicken.
- **Color**: always inherits `currentColor`. Never hard-code icon color.
- **Pairing with text**: 8px gap between icon and label. Icon optically-aligned (usually 1px baseline shift).
- **Standalone icon buttons**: always have a `title` attribute AND `aria-label`.

### Icons used in Kaya Web

| Icon | Purpose |
|---|---|
| `rotate-ccw` | Undo |
| `lightbulb` | Hint |
| `refresh-cw` | New game |
| `settings` | Settings |
| `volume-2` / `volume-x` | Sound on / off |
| `sun` / `moon` / `monitor` | Theme toggle |
| `check` | Win state, toggle-on |
| `x` | Close modal, loss-state mark |
| `minus` | Draw state |
| `chevron-left` / `chevron-right` | Carousels, stepper |
| `clock` | Timer label |
| `trophy` | Win indicator |

### Emoji

**Never used in UI.** Not in copy, not in labels, not in victory screens, not as skin-tone fallbacks. The one exception is the wordmark which uses a single stylized stone glyph (drawn as an SVG, NOT a unicode emoji).

### Unicode marks

A few unicode characters are used deliberately:
- `·` (interpunct, U+00B7) — as a score separator (`W 12 · L 8 · D 2`)
- `—` (em-dash, U+2014) — in prose
- `↺` is **not** used — we use Lucide `rotate-ccw` instead for consistency.

### Logo / Wordmark

The Kaya wordmark is `Kaya` set in **Fraunces 500** with `-0.02em` letter-spacing, preceded by a 1em-square SVG mark: a filled black stone with a single white dot offset to the upper-left (the specular highlight). The mark can stand alone as a favicon or app icon. See `assets/kaya-mark.svg` and `assets/kaya-wordmark.svg`.
