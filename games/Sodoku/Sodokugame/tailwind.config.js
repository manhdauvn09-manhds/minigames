/** @type {import('tailwindcss').Config} */
//
// Sodoku Tailwind config — extends the base theme with the design tokens
// extracted from `Design/styles/tokens.css` (see DESIGN_TOKENS.md).
//
// Tokens declared in `src/index.css` as CSS custom properties on `:root`
// and `:root[data-theme="dark"]`; this file maps them to Tailwind utility
// classes so authors can write `bg-bg`, `text-fg`, `bg-accent`, etc.
//
// Phase 1 = wire up + verify dark mode toggle. Phase 4 will add component
// recipes (board cells, number-pad keys) on top of this foundation.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Semantic surface
        bg:           'var(--bg)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-sunken':   'var(--bg-sunken)',
        // Foreground
        fg:           'var(--fg)',
        'fg-muted':   'var(--fg-muted)',
        'fg-subtle':  'var(--fg-subtle)',
        'fg-disabled':'var(--fg-disabled)',
        // Borders
        border:        'var(--border)',
        'border-strong':'var(--border-strong)',
        // Accent (sumi)
        accent:        'var(--accent)',
        'accent-hover':'var(--accent-hover)',
        'accent-press':'var(--accent-press)',
        'accent-ghost':'var(--accent-ghost)',
        // Status
        win:  'var(--win)',
        loss: 'var(--loss)',
        draw: 'var(--draw)',
      },
      fontFamily: {
        sans:  ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        board: 'var(--shadow-board)',
        stone: 'var(--shadow-stone)',
      },
      transitionTimingFunction: {
        spring:   'var(--ease-spring)',
        standard: 'var(--ease-standard)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [],
};
