"use client";

import { ArrowRight, Globe2 } from "lucide-react";
import { Card, CardHeader, DeltaPill } from "@/components/ui/primitives";
import { InfoTip } from "@/components/ui/InfoTip";
import { toBaselineBuyingPower } from "@/lib/ppp-data";
import {
  cn,
  flagEmoji,
  formatCurrency,
  formatPercent,
  formatSignedPercent,
} from "@/lib/format";
import type { ComparisonResult, SimulationInputs } from "@/lib/types";

/**
 * The NerdWallet-style equivalence statement, plus the two index views that back
 * it up: city cost of living (drives the budget) and country price level (drives
 * what a held balance is worth in globally comparable terms).
 */
export function CostOfLivingSummary({
  result,
  inputs,
}: {
  result: ComparisonResult;
  inputs: SimulationInputs;
}) {
  const { locationA, locationB, currency } = result;
  const cheaper = result.costOfLivingDeltaPercent < 0;

  const internationalValue = toBaselineBuyingPower(
    inputs.currentSavings,
    locationB.pppIndex,
    locationA.pppIndex
  );
  const pppDelta =
    inputs.currentSavings > 0
      ? (internationalValue / inputs.currentSavings - 1) * 100
      : 0;

  const maxIndex = Math.max(locationA.colIndex, locationB.colIndex, 100);

  return (
    <Card>
      <CardHeader
        title="Cost of living, side by side"
        description="What the same standard of living costs in each city"
      />

      <div className="px-5 pb-6 pt-5 sm:px-6">
        <p className="text-[15px] leading-relaxed text-fg-muted">
          You would need about{" "}
          <span className="font-bold text-fg">
            {formatCurrency(result.equivalentIncomeInB, currency)}
          </span>{" "}
          a year in{" "}
          <span className="font-semibold text-fg">
            {locationB.locationName}
          </span>{" "}
          to maintain the standard of living you have on{" "}
          <span className="font-bold text-fg">
            {formatCurrency(inputs.locationA.annualIncome, currency)}
          </span>{" "}
          in{" "}
          <span className="font-semibold text-fg">
            {locationA.locationName}
          </span>
          .
        </p>

        <div className="mt-6 space-y-4">
          <IndexBar
            label={locationA.locationName}
            countryCode={inputs.locationA.countryCode}
            index={locationA.colIndex}
            max={maxIndex}
            tone="a"
          />
          <IndexBar
            label={locationB.locationName}
            countryCode={inputs.locationB.countryCode}
            index={locationB.colIndex}
            max={maxIndex}
            tone="b"
            delta={result.costOfLivingDeltaPercent}
          />
        </div>

        <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              Overall difference
              <InfoTip
                content="Cost-of-living indices are city-level and weight housing heavily, which is why the gap is usually wider than a simple price comparison suggests."
                align="start"
              />
            </p>
            <p
              className={cn(
                "tabular mt-1.5 text-xl font-bold",
                cheaper ? "text-positive" : "text-negative"
              )}
            >
              {formatSignedPercent(result.costOfLivingDeltaPercent, 0)}
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              {locationB.locationName} is{" "}
              {formatPercent(Math.abs(result.costOfLivingDeltaPercent), 0)}{" "}
              {cheaper ? "cheaper" : "more expensive"} overall
            </p>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              <Globe2 className="h-3.5 w-3.5" aria-hidden />
              In international dollars
              <InfoTip
                content="Your existing savings restated using country price levels. This is a separate lens from the budget: it asks what the balance is worth in globally comparable purchasing power, not how fast it drains."
                align="end"
              />
            </p>
            <p className="tabular mt-1.5 text-xl font-bold text-fg">
              {formatCurrency(internationalValue, currency, true)}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
              <span>
                {formatCurrency(inputs.currentSavings, currency, true)} carries
              </span>
              <DeltaPill
                value={pppDelta}
                format={(v) => formatSignedPercent(v, 0)}
                className="px-2 py-0.5 text-[11px]"
              />
              <span>of local buying power</span>
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function IndexBar({
  label,
  countryCode,
  index,
  max,
  tone,
  delta,
}: {
  label: string;
  countryCode: string;
  index: number;
  max: number;
  tone: "a" | "b";
  delta?: number;
}) {
  const pct = Math.max(4, (index / max) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-fg">
          <span aria-hidden>{flagEmoji(countryCode)}</span>
          <span className="truncate">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {delta !== undefined && (
            <DeltaPill
              value={delta}
              invert
              format={(v) => formatSignedPercent(v, 0)}
              className="px-2 py-0.5 text-[11px]"
            />
          )}
          <span className="tabular text-sm font-bold text-fg">
            {Math.round(index)}
          </span>
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full origin-left rounded-full",
            tone === "a"
              ? "bg-gradient-to-r from-city-a/70 to-city-a"
              : "bg-gradient-to-r from-city-b/70 to-city-b"
          )}
          style={{
            width: `${pct}%`,
            animation: `grow-x 800ms cubic-bezier(0.16,1,0.3,1) ${tone === "b" ? 120 : 0}ms both`,
          }}
        />
        {/* US national average reference mark. */}
        <span
          aria-hidden
          className="absolute top-0 h-full w-px bg-fg/25"
          style={{ left: `${(100 / max) * 100}%` }}
        />
      </div>
      {tone === "b" && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-fg-subtle">
          <ArrowRight className="h-3 w-3 opacity-60" aria-hidden />
          The vertical mark is the US national average (100)
        </p>
      )}
    </div>
  );
}
