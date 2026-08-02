"use client";

import { Infinity as InfinityIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { InfoTip } from "@/components/ui/InfoTip";
import { cn, flagEmoji, formatMonths } from "@/lib/format";
import type { ComparisonResult, SimulationInputs } from "@/lib/types";

/**
 * The runway comparison, deliberately *not* a chart library bar. A plain pair of
 * animated tracks scaled against the projection horizon is easier to read than
 * any axis-based version, and the year gridlines give it precision.
 */
export function RunwayBars({
  result,
  inputs,
}: {
  result: ComparisonResult;
  inputs: SimulationInputs;
}) {
  const horizon = inputs.projectionMonths;
  const delta = result.runwayDifferenceMonths ?? 0;
  const years = Math.round(horizon / 12);
  const gridStep = years <= 6 ? 1 : years <= 12 ? 2 : years <= 25 ? 5 : 10;

  const rows = [
    {
      key: "a",
      name: result.locationA.locationName,
      countryCode: inputs.locationA.countryCode,
      months: result.locationA.runwayMonths,
      tone: "a" as const,
    },
    {
      key: "b",
      name: result.locationB.locationName,
      countryCode: inputs.locationB.countryCode,
      months: result.locationB.runwayMonths,
      tone: "b" as const,
    },
  ];

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Runway
            <InfoTip
              content="How long the balance lasts before it hits zero, given the monthly cashflow, expense inflation and investment return in each city."
              align="start"
            />
          </span>
        }
        description={`Months until savings are exhausted, across a ${years}-year window`}
      />

      <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        <div className="relative">
          {/* Year gridlines behind the tracks. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex justify-between"
          >
            {Array.from({ length: Math.floor(years / gridStep) + 1 }).map(
              (_, index) => (
                <span key={index} className="w-px bg-line" />
              )
            )}
          </div>

          <div className="relative space-y-5">
            {rows.map((row, index) => {
              const months = row.months;
              const survives = months === null;
              const pct =
                months === null
                  ? 100
                  : Math.max(2, Math.min(100, (months / horizon) * 100));
              return (
                <div key={row.key}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
                      <span aria-hidden>{flagEmoji(row.countryCode)}</span>
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span
                      className={cn(
                        "tabular shrink-0 text-sm font-bold",
                        survives ? "text-positive" : "text-fg"
                      )}
                    >
                      {months === null ? (
                        <span className="inline-flex items-center gap-1">
                          <InfinityIcon className="h-4 w-4" aria-hidden />
                          Never depletes
                        </span>
                      ) : (
                        formatMonths(months, true)
                      )}
                    </span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn(
                        "h-full origin-left rounded-full",
                        row.tone === "a"
                          ? "bg-gradient-to-r from-city-a/70 to-city-a"
                          : "bg-gradient-to-r from-city-b/70 to-city-b"
                      )}
                      style={{
                        width: `${pct}%`,
                        animation: `grow-x 900ms cubic-bezier(0.16,1,0.3,1) ${index * 120}ms both`,
                      }}
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={horizon}
                      aria-valuenow={months ?? horizon}
                      aria-label={`${row.name} runway`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div
            aria-hidden
            className="mt-3 flex justify-between text-[10px] font-bold uppercase tracking-wider text-fg-subtle"
          >
            {Array.from({ length: Math.floor(years / gridStep) + 1 }).map(
              (_, index) => (
                <span key={index}>
                  {index === 0 ? "Now" : `${index * gridStep}y`}
                </span>
              )
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-5 rounded-md border px-4 py-3 text-[13px] font-semibold",
            delta > 0
              ? "border-positive/20 bg-positive/8 text-positive"
              : delta < 0
                ? "border-negative/20 bg-negative/8 text-negative"
                : "border-line bg-surface-2 text-fg-muted"
          )}
        >
          {delta > 0
            ? `Moving buys you ${formatMonths(delta, true)} of extra runway.`
            : delta < 0
              ? `Moving costs you ${formatMonths(Math.abs(delta), true)} of runway.`
              : "Both cities give you effectively the same runway."}
        </div>
      </div>
    </Card>
  );
}
