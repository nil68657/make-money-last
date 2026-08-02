/**
 * Concrete colour values for Recharts, which needs real colour strings rather
 * than CSS variables (SVG attributes like `stroke` can take `var()`, but
 * gradient stops and computed fills cannot do so reliably across browsers).
 *
 * These mirror the semantic tokens in `src/app/globals.css`. Keep both in sync.
 */

export type ThemeMode = "light" | "dark";

export interface ChartTheme {
  grid: string;
  axis: string;
  axisLine: string;
  cityA: string;
  cityB: string;
  positive: string;
  negative: string;
  warning: string;
  muted: string;
  surface: string;
  border: string;
  fg: string;
  fgMuted: string;
  /** Opacity pair for gradient area fills: [top, bottom]. */
  areaOpacity: [number, number];
}

const light: ChartTheme = {
  grid: "#e6ebf3",
  axis: "#828da5",
  axisLine: "#dbe1ec",
  cityA: "#6366f1",
  cityB: "#0d9488",
  positive: "#059669",
  negative: "#e11d48",
  warning: "#ca6f06",
  muted: "#a3aec4",
  surface: "#ffffff",
  border: "#e2e7f0",
  fg: "#0d1322",
  fgMuted: "#56627c",
  areaOpacity: [0.34, 0.02],
};

const dark: ChartTheme = {
  grid: "#1e2740",
  axis: "#76829c",
  axisLine: "#2a3552",
  cityA: "#9194ff",
  cityB: "#2dd4bf",
  positive: "#34d399",
  negative: "#fb7185",
  warning: "#fbbf24",
  muted: "#4d5872",
  surface: "#111626",
  border: "#333f5c",
  fg: "#edf1f9",
  fgMuted: "#9ca7bf",
  areaOpacity: [0.42, 0.02],
};

export function getChartTheme(mode: ThemeMode): ChartTheme {
  return mode === "dark" ? dark : light;
}
