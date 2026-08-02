"use client";

import { useMemo, useState } from "react";
import { Sheet } from "./ui/Sheet";
import { SegmentedControl } from "./ui/primitives";
import { cn, flagEmoji, formatCurrency, formatPercent } from "@/lib/format";
import { blendedReturn, realReturn } from "@/lib/market-data";
import type { ComparisonResult, SimulationInputs } from "@/lib/types";

type Side = "A" | "B";

/**
 * Year-by-year detail, kept behind an overlay so the main results page stays
 * scannable. Rows are annual snapshots; the underlying model is monthly.
 */
export function DetailsSheet({
  open,
  onClose,
  result,
  inputs,
}: {
  open: boolean;
  onClose: () => void;
  result: ComparisonResult;
  inputs: SimulationInputs;
}) {
  const [side, setSide] = useState<Side>("B");

  const active = side === "A" ? result.locationA : result.locationB;
  const profile = side === "A" ? inputs.locationA : inputs.locationB;
  const currency = result.currency;

  const rows = useMemo(() => {
    const trajectory = active.trajectory;
    return trajectory.filter(
      (snapshot, index) =>
        index % 12 === 0 || index === trajectory.length - 1
    );
  }, [active.trajectory]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="center"
      widthClass="sm:max-w-3xl"
      title="Year-by-year breakdown"
      description="Annual snapshots of a month-by-month simulation"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Side>
          ariaLabel="Choose a city"
          value={side}
          onChange={setSide}
          options={[
            {
              value: "A",
              label: (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>
                    {flagEmoji(inputs.locationA.countryCode)}
                  </span>
                  {result.locationA.locationName}
                </span>
              ),
            },
            {
              value: "B",
              label: (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>
                    {flagEmoji(inputs.locationB.countryCode)}
                  </span>
                  {result.locationB.locationName}
                </span>
              ),
            },
          ]}
        />
        <p className="text-xs text-fg-muted">
          Inflation {formatPercent(profile.inflationRate)} · {profile.marketIndex}{" "}
          {formatPercent(profile.marketReturn)} nominal
        </p>
      </div>

      <div className="scrollbar-slim overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left">
              {[
                "Date",
                "Balance",
                "In today's prices",
                "Take-home",
                "Spend",
                "Net",
              ].map((heading, index) => (
                <th
                  key={heading}
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-fg-subtle",
                    index > 0 && "text-right"
                  )}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.monthIndex}
                className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-2/60"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-fg">
                  {row.date}
                </td>
                <td
                  className={cn(
                    "tabular whitespace-nowrap px-4 py-2.5 text-right font-bold",
                    row.savings <= 0 ? "text-negative" : "text-fg"
                  )}
                >
                  {formatCurrency(row.savings, currency)}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-fg-muted">
                  {formatCurrency(row.realSavings, currency)}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-fg-muted">
                  {formatCurrency(row.monthlyIncome, currency)}
                </td>
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-right text-fg-muted">
                  {formatCurrency(row.totalExpenses, currency)}
                </td>
                <td
                  className={cn(
                    "tabular whitespace-nowrap px-4 py-2.5 text-right font-semibold",
                    row.monthlyNet >= 0 ? "text-positive" : "text-negative"
                  )}
                >
                  {row.monthlyNet >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(row.monthlyNet), currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface-2/50 p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
          How this is calculated
        </h4>
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-fg-muted">
          <li>
            <span className="font-semibold text-fg">Take-home</span> = gross
            income ÷ 12, grown at {formatPercent(inputs.assumptions.incomeGrowth)}{" "}
            a year, less a flat{" "}
            {formatPercent(inputs.assumptions.effectiveTaxRate, 0)} tax rate.
          </li>
          <li>
            <span className="font-semibold text-fg">Spend</span> inflates each
            category at {formatPercent(profile.inflationRate)} a year times that
            category&apos;s multiplier.
          </li>
          <li>
            <span className="font-semibold text-fg">Balance</span> earns{" "}
            {formatPercent(profile.marketReturn)} a year — the long-run nominal
            return of {profile.marketIndex}, this city&apos;s market — on the{" "}
            {formatPercent(inputs.assumptions.investedPercentage, 0)} of it held
            in the market, so{" "}
            {formatPercent(
              blendedReturn(
                profile.marketReturn,
                inputs.assumptions.investedPercentage
              ),
              2
            )}{" "}
            in practice. That is{" "}
            {formatPercent(realReturn(profile.marketReturn, profile.inflationRate), 1)}{" "}
            after inflation.
          </li>
          <li>
            <span className="font-semibold text-fg">In today&apos;s money</span>{" "}
            divides the balance by the cumulative basket price level, so you see
            real buying power rather than the nominal figure.
          </li>
          <li>
            Both columns are in {currency}, the destination currency. Costs are
            re-priced by cost-of-living index; the exchange rate was applied
            once, to your starting balance, and nowhere else.
          </li>
        </ul>
      </div>
    </Sheet>
  );
}
