"use client";

import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Pencil,
  Rows3,
  SlidersHorizontal,
  TrendingDown,
} from "lucide-react";
import { ResultHero } from "./ResultHero";
import { MetricCards } from "./MetricCards";
import { RunwayBars } from "./RunwayBars";
import { CostOfLivingSummary } from "./CostOfLivingSummary";
import { TrajectoryChart } from "@/components/charts/TrajectoryChart";
import { ExpenseComparisonChart } from "@/components/charts/ExpenseComparisonChart";
import { BuyingPowerChart } from "@/components/charts/BuyingPowerChart";
import {
  Button,
  Card,
  CardHeader,
  SegmentedControl,
  Skeleton,
} from "@/components/ui/primitives";
import { FxNote } from "@/components/ui/FxNote";
import { flagEmoji, formatCurrency } from "@/lib/format";
import type { ComparisonResult, SimulationInputs } from "@/lib/types";

type ChartTab = "trajectory" | "categories" | "buying-power";

const CHART_COPY: Record<ChartTab, { title: string; description: string }> = {
  trajectory: {
    title: "Savings trajectory",
    description: "Your balance month by month in each city, until it runs out",
  },
  categories: {
    title: "Where the money goes",
    description: "Monthly spend by category, at today's prices",
  },
  "buying-power": {
    title: "Nominal vs real buying power",
    description: "The same balance, before and after inflation",
  },
};

export function ResultsView({
  result,
  inputs,
  onEdit,
  onAssumptions,
  onDetails,
}: {
  result: ComparisonResult;
  inputs: SimulationInputs;
  onEdit: () => void;
  onAssumptions: () => void;
  onDetails: () => void;
}) {
  const [tab, setTab] = useState<ChartTab>("trajectory");
  const copy = CHART_COPY[tab];

  return (
    <div className="mx-auto max-w-content space-y-4 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <RouteBar
        inputs={inputs}
        onEdit={onEdit}
        onAssumptions={onAssumptions}
      />

      <div className="animate-in-up">
        <ResultHero result={result} inputs={inputs} />
      </div>

      <div className="animate-in-up stagger-1 pt-2">
        <MetricCards result={result} inputs={inputs} />
      </div>

      <div className="animate-in-up stagger-2 grid gap-4 pt-2 lg:grid-cols-2">
        <RunwayBars result={result} inputs={inputs} />
        <CostOfLivingSummary result={result} inputs={inputs} />
      </div>

      <Card className="animate-in-up stagger-3 mt-2">
        <CardHeader
          title={copy.title}
          description={copy.description}
          action={
            <SegmentedControl<ChartTab>
              ariaLabel="Chart view"
              value={tab}
              onChange={setTab}
              size="sm"
              options={[
                {
                  value: "trajectory",
                  name: "Runway",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Runway</span>
                    </span>
                  ),
                },
                {
                  value: "categories",
                  name: "Categories",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Categories</span>
                    </span>
                  ),
                },
                {
                  value: "buying-power",
                  name: "Buying power",
                  label: (
                    <span className="flex items-center gap-1.5">
                      <Rows3 className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Buying power</span>
                    </span>
                  ),
                },
              ]}
            />
          }
        />

        <div className="px-3 pb-5 pt-5 sm:px-5 sm:pb-6">
          {tab === "trajectory" && (
            <TrajectoryChart result={result} currency={result.currency} />
          )}
          {tab === "categories" && (
            <ExpenseComparisonChart
              result={result}
              currency={result.currency}
            />
          )}
          {tab === "buying-power" && (
            <BuyingPowerChart result={result} currency={result.currency} />
          )}
        </div>
      </Card>

      <Card className="animate-in-up stagger-4 mt-2 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-fg">
            Want the raw numbers?
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            Year-by-year balance, income, spend and net cashflow for both cities.
          </p>
        </div>
        <Button variant="secondary" onClick={onDetails}>
          View breakdown
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </Card>

      <MethodologyNote result={result} inputs={inputs} />
    </div>
  );
}

function RouteBar({
  inputs,
  onEdit,
  onAssumptions,
}: {
  inputs: SimulationInputs;
  onEdit: () => void;
  onAssumptions: () => void;
}) {
  const currency = inputs.displayCurrency;
  const converted =
    inputs.savingsConversion.enteredCurrency !== inputs.displayCurrency;
  return (
    <div className="glass sticky top-[4.25rem] z-30 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-1.5 font-bold text-fg">
          <span aria-hidden>{flagEmoji(inputs.locationA.countryCode)}</span>
          <span className="truncate">{inputs.locationA.name}</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
        <span className="flex min-w-0 items-center gap-1.5 font-bold text-fg">
          <span aria-hidden>{flagEmoji(inputs.locationB.countryCode)}</span>
          <span className="truncate">{inputs.locationB.name}</span>
        </span>
      </div>

      <div className="hidden items-center gap-4 text-xs text-fg-muted md:flex">
        <span>
          Savings{" "}
          <span className="tabular font-bold text-fg">
            {formatCurrency(inputs.currentSavings, currency, true)}
          </span>
          {converted && (
            <span className="text-fg-subtle">
              {" "}
              (from{" "}
              {formatCurrency(
                inputs.savingsConversion.enteredAmount,
                inputs.savingsConversion.enteredCurrency,
                true
              )}
              )
            </span>
          )}
        </span>
        <span>
          Income{" "}
          <span className="tabular font-bold text-fg">
            {formatCurrency(inputs.locationB.annualIncome, currency, true)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onAssumptions}
          aria-label="Assumptions"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Assumptions</span>
        </Button>
      </div>
    </div>
  );
}

function MethodologyNote({
  result,
  inputs,
}: {
  result: ComparisonResult;
  inputs: SimulationInputs;
}) {
  const { savingsConversion: conversion, displayCurrency } = inputs;
  const converted = conversion.enteredCurrency !== displayCurrency;

  return (
    <div className="mt-6 rounded-lg border border-line bg-surface-2/40 p-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-fg-subtle">
        About these numbers
      </h3>
      <p className="mt-2.5 text-xs leading-relaxed text-fg-muted">
        Every figure is shown in {displayCurrency}, the currency of{" "}
        {result.locationB.locationName}, because that is where the decision
        lands.{" "}
        {converted ? (
          <>
            Your {formatCurrency(conversion.enteredAmount, conversion.enteredCurrency)}{" "}
            of savings was converted once at the market rate to{" "}
            {formatCurrency(inputs.currentSavings, displayCurrency)}; nothing
            else in the projection touches an exchange rate.
          </>
        ) : (
          <>Both cities already use {displayCurrency}, so no exchange rate is involved.</>
        )}{" "}
        Exchange rates convert between units of money and are kept separate from
        the two price-level figures: the cost-of-living index re-prices the
        basket city by city, and the country price level drives the
        international-dollars comparison. Cost-of-living indices, price levels
        and default inflation rates are approximate reference figures compiled
        from public sources and hand-calibrated — a 2024–2025 snapshot, not live
        data. Your starting budget is estimated from your income and the local
        cost-of-living index, then re-priced per category; housing responds far
        more strongly to location than groceries or insurance do. Taxes are a
        single flat effective rate, and a depleted balance stops at zero rather
        than going negative. Treat the output as a directional model for
        comparing two options, not financial advice.
      </p>
      {converted && (
        <FxNote
          from={conversion.enteredCurrency}
          to={displayCurrency}
          className="mt-2"
        />
      )}
    </div>
  );
}

/** Shown while the projection is being prepared. */
export function ResultsSkeleton() {
  return (
    <div className="mx-auto max-w-content space-y-4 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-[19rem] w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[7.5rem] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-[26rem] w-full rounded-xl" />
      <span className="sr-only" role="status">
        Running your projection
      </span>
    </div>
  );
}
