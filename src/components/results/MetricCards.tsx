"use client";

import { useState } from "react";
import {
  CalendarClock,
  Flame,
  Gauge,
  PiggyBank,
  Scale,
  Wallet,
} from "lucide-react";
import { AnimatedNumber, Card, IconChip } from "@/components/ui/primitives";
import { InfoTip } from "@/components/ui/InfoTip";
import { MetricDetailSheet, type MetricKey } from "./MetricDetailSheet";
import {
  cn,
  formatCurrency,
  formatMonths,
  formatPercent,
  formatSignedPercent,
} from "@/lib/format";
import type { ComparisonResult, SimulationInputs } from "@/lib/types";

type Tone = "positive" | "negative" | "neutral";

/**
 * Six headline metrics for the destination city, each carrying the current-city
 * figure underneath so every number has a baseline.
 */
export function MetricCards({
  result,
  inputs,
}: {
  result: ComparisonResult;
  inputs: SimulationInputs;
}) {
  const { locationA, locationB, currency } = result;
  const nameA = locationA.locationName;
  const [openMetric, setOpenMetric] = useState<MetricKey | null>(null);

  const money = (value: number) => formatCurrency(value, currency);

  const metrics: {
    key: MetricKey;
    label: string;
    hint: string;
    icon: typeof Flame;
    value: React.ReactNode;
    baseline: string;
    tone: Tone;
  }[] = [
    {
      key: "burn",
      label: "Monthly burn",
      hint: "Total monthly spending across every category, at today's prices.",
      icon: Flame,
      value: (
        <AnimatedNumber value={locationB.monthlyExpenses} format={money} />
      ),
      baseline: `${money(locationA.monthlyExpenses)} in ${nameA}`,
      tone: locationB.monthlyExpenses <= locationA.monthlyExpenses
        ? "positive"
        : "negative",
    },
    {
      key: "cashflow",
      label: "Net cashflow",
      hint: "Take-home income minus spending, plus any extra contribution. Positive means the balance grows.",
      icon: Wallet,
      value: (
        <span
          className={cn(
            locationB.monthlyNet >= 0 ? "text-positive" : "text-negative"
          )}
        >
          {locationB.monthlyNet >= 0 ? "+" : "−"}
          <AnimatedNumber
            value={Math.abs(locationB.monthlyNet)}
            format={money}
          />
        </span>
      ),
      baseline: `${locationA.monthlyNet >= 0 ? "+" : "−"}${money(Math.abs(locationA.monthlyNet))} in ${nameA}`,
      tone: locationB.monthlyNet >= 0 ? "positive" : "negative",
    },
    {
      key: "savings-rate",
      label: "Savings rate",
      hint: "Share of take-home income you keep each month. Negative means you're dipping into savings.",
      icon: PiggyBank,
      value: (
        <AnimatedNumber
          value={locationB.savingsRate}
          format={(v) => formatPercent(v, 0)}
        />
      ),
      baseline: `${formatPercent(locationA.savingsRate, 0)} in ${nameA}`,
      tone: locationB.savingsRate >= locationA.savingsRate
        ? "positive"
        : "negative",
    },
    {
      key: "runway",
      label: "Runway",
      hint: "Time until the balance reaches zero, including investment returns on what's left.",
      icon: Gauge,
      value: locationB.runwayMonths === null
        ? "Never"
        : formatMonths(locationB.runwayMonths),
      baseline:
        locationA.runwayMonths === null
          ? `Never in ${nameA}`
          : `${formatMonths(locationA.runwayMonths)} in ${nameA}`,
      tone:
        (locationB.runwayMonths ?? inputs.projectionMonths) >=
        (locationA.runwayMonths ?? inputs.projectionMonths)
          ? "positive"
          : "negative",
    },
    {
      key: "doubling",
      label: "Doubling point",
      hint: "The month your balance reaches twice what you started with. Only reachable with positive cashflow.",
      icon: CalendarClock,
      value:
        locationB.breakEvenMonth === null
          ? "Out of range"
          : formatMonths(locationB.breakEvenMonth),
      baseline:
        locationA.breakEvenMonth === null
          ? `Out of range in ${nameA}`
          : `${formatMonths(locationA.breakEvenMonth)} in ${nameA}`,
      tone: locationB.breakEvenMonth !== null ? "positive" : "neutral",
    },
    {
      key: "cost-of-living",
      label: "Cost of living",
      hint: "Difference in the overall cost-of-living index between the two cities, where 100 is the US average.",
      icon: Scale,
      value: (
        <AnimatedNumber
          value={result.costOfLivingDeltaPercent}
          format={(v) => formatSignedPercent(v, 0)}
        />
      ),
      baseline: `Index ${Math.round(locationB.colIndex)} vs ${Math.round(locationA.colIndex)}`,
      tone: result.costOfLivingDeltaPercent <= 0 ? "positive" : "negative",
    },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric, index) => (
          <Card
            key={metric.label}
            interactive
            data-testid="metric-card"
            className="animate-in-up relative p-5"
            style={{ "--delay": `${index * 55}ms` } as React.CSSProperties}
          >
            {/* Full-bleed trigger sits under the content, which is click-through,
                so the whole card opens the detail while the InfoTip stays live. */}
            <button
              type="button"
              onClick={() => setOpenMetric(metric.key)}
              aria-label={`${metric.label} month by month`}
              className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
            />

            <div className="pointer-events-none relative z-10">
              <div className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
                    {metric.label}
                  </span>
                  <span className="pointer-events-auto inline-flex">
                    <InfoTip content={metric.hint} align="start" />
                  </span>
                </span>
                <IconChip
                  tone={
                    metric.tone === "positive"
                      ? "positive"
                      : metric.tone === "negative"
                        ? "negative"
                        : "neutral"
                  }
                >
                  <metric.icon className="h-4 w-4" aria-hidden />
                </IconChip>
              </div>

              <p className="tabular mt-3 text-2xl font-bold tracking-tight text-fg">
                {metric.value}
              </p>
              <p className="mt-1.5 text-xs text-fg-muted">{metric.baseline}</p>
            </div>
          </Card>
        ))}
      </div>

      <MetricDetailSheet
        metric={openMetric}
        result={result}
        onClose={() => setOpenMetric(null)}
      />
    </>
  );
}
