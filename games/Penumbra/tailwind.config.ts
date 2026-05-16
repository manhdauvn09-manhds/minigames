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
        display: ["Cormorant Garamond", "Noto Serif JP", "serif"],
        body: ["Inter", "Noto Sans JP", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
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
