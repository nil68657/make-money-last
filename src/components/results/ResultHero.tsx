"use client";

import { ArrowRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import {
  cn,
  flagEmoji,
  formatCurrency,
  formatMonths,
  monthsToParts,
} from "@/lib/format";
import type { ComparisonResult, SimulationInputs } from "@/lib/types";

/**
 * The unmistakable answer. One sentence, one enormous number, and the baseline
 * it beats — everything else on the page is supporting evidence.
 */
export function ResultHero({
  result,
  inputs,
}: {
  result: ComparisonResult;
  inputs: SimulationInputs;
}) {
  const { locationA, locationB } = result;
  const currency = result.currency;
  const years = Math.round(inputs.projectionMonths / 12);

  const survivesB = locationB.runwayMonths === null;
  const partsB = monthsToParts(locationB.runwayMonths);
  const delta = result.runwayDifferenceMonths ?? 0;
  const better = delta > 0;

  return (
    <div className="mesh-panel card-sheen relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-lg sm:p-8 lg:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-city-b/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="cityB">
            <span aria-hidden>{flagEmoji(inputs.locationB.countryCode)}</span>
            {locationB.locationName}
          </Badge>
          <Badge tone="neutral">{years}-year projection</Badge>
        </div>

        <p className="mt-6 text-[15px] font-semibold text-fg-muted sm:text-base">
          {survivesB ? (
            <>Move to {locationB.locationName} and your savings</>
          ) : (
            <>In {locationB.locationName}, your savings last</>
          )}
        </p>

        {survivesB ? (
          <p className="mt-1 text-display-sm font-bold text-fg sm:text-display lg:text-display-lg">
            <span className="gradient-text">never run out</span>
          </p>
        ) : (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-fg">
            <span className="text-display-sm font-bold sm:text-display lg:text-display-lg">
              <span className="tabular">{partsB?.years ?? 0}</span>
              <span className="ml-1.5 text-[0.42em] font-bold uppercase tracking-wider text-fg-muted">
                {partsB?.years === 1 ? "year" : "years"}
              </span>
            </span>
            {(partsB?.months ?? 0) > 0 && (
              <span className="text-display-sm font-bold sm:text-display lg:text-display-lg">
                <span className="tabular">{partsB?.months}</span>
                <span className="ml-1.5 text-[0.42em] font-bold uppercase tracking-wider text-fg-muted">
                  {partsB?.months === 1 ? "month" : "months"}
                </span>
              </span>
            )}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="text-fg-muted">
            versus{" "}
            <span className="font-bold text-fg">
              {locationA.runwayMonths === null
                ? "no depletion"
                : formatMonths(locationA.runwayMonths, true)}
            </span>{" "}
            staying in {locationA.locationName}
          </span>

          {delta !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-bold",
                better
                  ? "border-positive/25 bg-positive/10 text-positive"
                  : "border-negative/25 bg-negative/10 text-negative"
              )}
            >
              {better ? (
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" aria-hidden />
              )}
              {better ? "+" : "−"}
              {formatMonths(Math.abs(delta))} of runway
            </span>
          )}
        </div>

        <div className="mt-7 grid gap-3 border-t border-line pt-6 sm:grid-cols-3">
          <HeroStat
            label={`Left after ${years} years`}
            value={formatCurrency(locationB.finalSavings, currency, true)}
            sub={`${formatCurrency(locationA.finalSavings, currency, true)} in ${locationA.locationName}`}
            tone={
              locationB.finalSavings >= locationA.finalSavings
                ? "positive"
                : "negative"
            }
          />
          <HeroStat
            label="Monthly cashflow"
            value={`${locationB.monthlyNet >= 0 ? "+" : "−"}${formatCurrency(Math.abs(locationB.monthlyNet), currency)}`}
            sub={
              locationB.monthlyNet >= 0
                ? "Adding to savings every month"
                : "Drawing down every month"
            }
            tone={locationB.monthlyNet >= 0 ? "positive" : "negative"}
          />
          <HeroStat
            label="Cost of living"
            value={`${result.costOfLivingDeltaPercent >= 0 ? "+" : "−"}${Math.abs(
              Math.round(result.costOfLivingDeltaPercent)
            )}%`}
            sub={`${result.costOfLivingDeltaPercent >= 0 ? "More" : "Less"} expensive than ${locationA.locationName}`}
            tone={result.costOfLivingDeltaPercent <= 0 ? "positive" : "negative"}
          />
        </div>

        {survivesB && (
          <p className="mt-6 inline-flex items-start gap-2 rounded-md border border-positive/20 bg-positive/8 px-3.5 py-2.5 text-[13px] font-medium text-positive">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Your income covers your costs here, so the balance keeps compounding
            instead of draining.
          </p>
        )}
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "positive" | "negative";
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <p className="tabular mt-1.5 text-xl font-bold tracking-tight text-fg">
        {value}
      </p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-xs",
          tone === "positive" ? "text-positive" : "text-fg-muted"
        )}
      >
        <ArrowRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        {sub}
      </p>
    </div>
  );
}
