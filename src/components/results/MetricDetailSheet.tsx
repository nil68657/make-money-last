"use client";

import { useMemo } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { cn, formatCurrency, formatPercent } from "@/lib/format";
import type { ComparisonResult, MonthlySnapshot } from "@/lib/types";

export type MetricKey =
  | "burn"
  | "cashflow"
  | "savings-rate"
  | "runway"
  | "doubling"
  | "cost-of-living";

/**
 * How each headline metric unrolls into a month-by-month series. Every metric
 * card is backed by one column of the simulation, so the overlay can show the
 * same number the card summarises, month by month, for both cities.
 */
const SERIES: Record<
  MetricKey,
  {
    title: string;
    column: string;
    note: string;
    /** Percent-valued metrics format differently and have no meaningful gap sum. */
    percent?: boolean;
    value: (snapshot: MonthlySnapshot) => number;
  }
> = {
  burn: {
    title: "Monthly burn",
    column: "Monthly spend",
    note: "Total spending across every category, inflated month by month at each city's category rates.",
    value: (s) => s.totalExpenses,
  },
  cashflow: {
    title: "Net cashflow",
    column: "Net per month",
    note: "Take-home income minus spending, plus any extra contribution. Negative months draw the balance down.",
    value: (s) => s.monthlyNet,
  },
  "savings-rate": {
    title: "Savings rate",
    column: "Share of take-home kept",
    percent: true,
    note: "Net cashflow as a share of take-home income. Falls over time whenever expense inflation outruns your raises.",
    value: (s) => (s.monthlyIncome > 0 ? (s.monthlyNet / s.monthlyIncome) * 100 : 0),
  },
  runway: {
    title: "Runway",
    column: "Balance",
    note: "The remaining balance after returns and that month's cashflow. Runway is the month this reaches zero.",
    value: (s) => s.savings,
  },
  doubling: {
    title: "Doubling point",
    column: "Balance",
    note: "The doubling point is the first month the balance reaches twice what you started with.",
    value: (s) => s.savings,
  },
  "cost-of-living": {
    title: "Cost of living",
    column: "Monthly spend",
    note: "The same basket priced in each city, carried forward at each city's own inflation rate.",
    value: (s) => s.totalExpenses,
  },
};

/**
 * Rows are dense for the first year — where most of the decision lives — then
 * annual, so a 30-year projection stays readable without dropping the ending.
 */
function sampleIndices(length: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < Math.min(12, length); i++) out.push(i);
  for (let i = 12; i < length; i += 12) out.push(i);
  const last = length - 1;
  if (last > 0 && out[out.length - 1] !== last) out.push(last);
  return out;
}

export function MetricDetailSheet({
  metric,
  result,
  onClose,
}: {
  metric: MetricKey | null;
  result: ComparisonResult;
  onClose: () => void;
}) {
  const spec = metric ? SERIES[metric] : null;
  const currency = result.currency;
  const nameA = result.locationA.locationName;
  const nameB = result.locationB.locationName;

  const rows = useMemo(() => {
    if (!spec) return [];
    const a = result.locationA.trajectory;
    const b = result.locationB.trajectory;
    return sampleIndices(Math.min(a.length, b.length)).map((index) => ({
      index,
      date: a[index].date,
      a: spec.value(a[index]),
      b: spec.value(b[index]),
    }));
  }, [spec, result]);

  const format = (value: number) =>
    spec?.percent ? formatPercent(value, 1) : formatCurrency(value, currency);

  return (
    <Sheet
      open={metric !== null}
      onClose={onClose}
      side="center"
      widthClass="sm:max-w-2xl"
      title={spec ? `${spec.title} month by month` : "Detail"}
      description={spec?.note}
    >
      <div className="scrollbar-slim overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">
            {spec?.column} by month in {nameA} and {nameB}
          </caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left">
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-fg-subtle"
              >
                Month
              </th>
              {[nameA, nameB, "Gap"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-fg-subtle"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const gap = row.b - row.a;
              return (
                <tr
                  key={row.index}
                  className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2/60"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-fg">
                    {row.date}
                    {row.index === 0 && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
                        now
                      </span>
                    )}
                  </td>
                  <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-fg-muted">
                    {format(row.a)}
                  </td>
                  <td className="tabular whitespace-nowrap px-4 py-2.5 text-right font-semibold text-fg">
                    {format(row.b)}
                  </td>
                  <td
                    className={cn(
                      "tabular whitespace-nowrap px-4 py-2.5 text-right font-semibold",
                      Math.abs(gap) < 0.5
                        ? "text-fg-subtle"
                        : gap > 0
                          ? "text-positive"
                          : "text-negative"
                    )}
                  >
                    {gap > 0 ? "+" : gap < 0 ? "−" : ""}
                    {format(Math.abs(gap))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-fg-muted">
        Dense for the first year, then one row per year. Every figure is shown in{" "}
        {currency}.
      </p>
    </Sheet>
  );
}
