import type { Config } from "tailwindcss";

/**
 * Semantic-token Tailwind theme. Colours resolve to CSS variables defined in
 * `src/app/globals.css`, stored as RGB channels so `/opacity` modifiers work
 * (e.g. `bg-brand/10`). Light and dark are the same class names throughout —
 * theming happens entirely in the variable layer.
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: rgb("bg"),
        "bg-deep": rgb("bg-deep"),
        surface: {
          DEFAULT: rgb("surface"),
          2: rgb("surface-2"),
          3: rgb("surface-3"),
          inverse: rgb("surface-inverse"),
        },
        line: {
          DEFAULT: rgb("border"),
          strong: rgb("border-strong"),
        },
        fg: {
          DEFAULT: rgb("fg"),
          muted: rgb("fg-muted"),
          subtle: rgb("fg-subtle"),
          inverse: rgb("fg-inverse"),
        },
        brand: {
          DEFAULT: rgb("brand"),
          hover: rgb("brand-hover"),
          soft: rgb("brand-soft"),
          fg: rgb("brand-fg"),
        },
        accent: rgb("accent"),
        positive: {
          DEFAULT: rgb("positive"),
          soft: rgb("positive-soft"),
        },
        negative: {
          DEFAULT: rgb("negative"),
          soft: rgb("negative-soft"),
        },
        warning: {
          DEFAULT: rgb("warning"),
          soft: rgb("warning-soft"),
        },
        "city-a": rgb("city-a"),
        "city-b": rgb("city-b"),
      },
      // Tailwind's opacity modifier only accepts values on this scale, and it
      // drops off-scale ones silently. These three are used for the very faint
      // tinted surfaces (bg-positive/8, ring-brand/12, mark bg-brand/18).
      opacity: {
        8: "0.08",
        12: "0.12",
        18: "0.18",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Tightened tracking on the display sizes; default Inter is too loose
        // once you get above ~32px.
        "display-sm": ["2rem", { lineHeight: "1.14", letterSpacing: "-0.022em" }],
        display: ["2.75rem", { lineHeight: "1.06", letterSpacing: "-0.028em" }],
        "display-lg": ["3.75rem", { lineHeight: "1.02", letterSpacing: "-0.032em" }],
        "display-xl": ["4.75rem", { lineHeight: "0.98", letterSpacing: "-0.036em" }],
      },
      spacing: {
        // Half-steps for icon sizing, plus 8pt rhythm extensions.
        4.5: "1.125rem",
        13: "3.25rem",
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      maxWidth: {
        content: "76rem",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translate3d(0, 14px, 0)" },
          to: { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translate3d(100%, 0, 0)" },
          to: { transform: "translate3d(0, 0, 0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-150% 0" },
          to: { backgroundPosition: "250% 0" },
        },
        "grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -10px, 0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 560ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 320ms ease-out both",
        "scale-in": "scale-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 340ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "grow-x": "grow-x 900ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "float-slow": "float-slow 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
