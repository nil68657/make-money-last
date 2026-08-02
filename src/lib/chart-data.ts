import type { ComparisonResult, MonthlySnapshot } from "./types";

export interface TrajectoryPoint {
  monthIndex: number;
  date: string;
  /** Nominal balance. */
  a: number;
  b: number;
  /** Balance restated in month-0 prices. */
  aReal: number;
  bReal: number;
}

/**
 * A 30-year projection is 361 points per series. Thinning long horizons keeps
 * the SVG light without visibly changing the curves, while short horizons stay
 * month-accurate.
 */
function stepFor(length: number): number {
  if (length <= 121) return 1;
  if (length <= 241) return 2;
  return 3;
}

export function buildTrajectoryData(
  result: ComparisonResult
): TrajectoryPoint[] {
  const a = result.locationA.trajectory;
  const b = result.locationB.trajectory;
  const length = Math.min(a.length, b.length);
  const step = stepFor(length);
  const points: TrajectoryPoint[] = [];

  for (let i = 0; i < length; i += step) {
    points.push(toPoint(a[i], b[i]));
  }
  // Always pin the final month so the axis ends on the real horizon.
  const last = length - 1;
  if (points[points.length - 1]?.monthIndex !== a[last].monthIndex) {
    points.push(toPoint(a[last], b[last]));
  }
  return points;
}

function toPoint(a: MonthlySnapshot, b: MonthlySnapshot): TrajectoryPoint {
  return {
    monthIndex: a.monthIndex,
    date: a.date,
    a: a.savings,
    b: b.savings,
    aReal: a.pppAdjustedSavings,
    bReal: b.pppAdjustedSavings,
  };
}

export interface CategoryPoint {
  label: string;
  short: string;
  a: number;
  b: number;
  deltaPercent: number | null;
}

const SHORT_LABELS: Record<string, string> = {
  rent: "Housing",
  food: "Food",
  medical: "Medical",
  school: "School",
  utilities: "Utilities",
  other: "Other",
};

export function buildCategoryData(result: ComparisonResult): CategoryPoint[] {
  return result.categories.map((entry) => ({
    label: entry.label,
    short: SHORT_LABELS[entry.category] ?? entry.label,
    a: Math.round(entry.a),
    b: Math.round(entry.b),
    deltaPercent: entry.deltaPercent,
  }));
}

/** Year ticks for a monthly x-axis, e.g. every 12 or 60 months. */
export function yearTicks(points: TrajectoryPoint[]): number[] {
  if (points.length === 0) return [];
  const span = points[points.length - 1].monthIndex;
  const years = Math.max(1, Math.round(span / 12));
  const everyYears = years <= 6 ? 1 : years <= 12 ? 2 : years <= 25 ? 5 : 10;
  const ticks: number[] = [];
  for (let m = 0; m <= span; m += everyYears * 12) ticks.push(m);
  return ticks;
}
