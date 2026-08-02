"use client";

import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { Sheet } from "./ui/Sheet";
import { Button, Divider } from "./ui/primitives";
import {
  FieldLabel,
  MoneyInput,
  NumberInput,
  RangeField,
  SwitchField,
} from "./ui/Field";
import { InfoTip } from "./ui/InfoTip";
import { cn, flagEmoji, formatCurrency, formatPercent } from "@/lib/format";
import { sumExpenses } from "@/lib/simulation";
import {
  Assumptions,
  EXPENSE_CATEGORIES,
  EXPENSE_HINTS,
  EXPENSE_LABELS,
  EXPENSE_SHORT_LABELS,
  ExpenseCategory,
  LocationProfile,
  SimulationInputs,
} from "@/lib/types";

export type Side = "A" | "B";

/**
 * Everything the model assumes, in one place, so none of it is hidden. Split
 * into portfolio-wide dials and per-city dials.
 */
export function AssumptionsDrawer({
  open,
  onClose,
  inputs,
  onInputs,
  onAssumptions,
  onLocation,
  onExpense,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  inputs: SimulationInputs;
  onInputs: (partial: Partial<SimulationInputs>) => void;
  onAssumptions: (partial: Partial<Assumptions>) => void;
  onLocation: (side: Side, partial: Partial<LocationProfile>) => void;
  onExpense: (side: Side, category: ExpenseCategory, value: number) => void;
  onReset: () => void;
}) {
  const { assumptions, locationA, locationB } = inputs;
  const currency = inputs.displayCurrency;
  const uid = useId();

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Assumptions"
      description="Every number the projection depends on. Change anything and the results update instantly."
      widthClass="sm:max-w-xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset to defaults
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <Section
          title="Projection"
          description="How far out to model, and what happens to the money you keep."
        >
          <div className="space-y-5">
            <RangeField
              label="Projection horizon"
              hint="How many years the simulation runs. Longer horizons make inflation effects much more visible."
              value={inputs.projectionMonths}
              onChange={(value) => onInputs({ projectionMonths: value })}
              min={60}
              max={480}
              step={12}
              format={(value) => `${Math.round(value / 12)} years`}
            />
            <RangeField
              label="Investment return"
              hint="Annual nominal return earned on the remaining balance. Applied monthly, and only while the balance is positive."
              value={assumptions.investmentReturn}
              onChange={(value) => onAssumptions({ investmentReturn: value })}
              min={0}
              max={12}
              step={0.25}
              format={(value) => formatPercent(value, 2)}
            />
            <RangeField
              label="Annual raise"
              hint="Nominal income growth. If this is below your expense inflation, your position slowly worsens even with a positive cashflow today."
              value={assumptions.incomeGrowth}
              onChange={(value) => onAssumptions({ incomeGrowth: value })}
              min={0}
              max={10}
              step={0.25}
              format={(value) => formatPercent(value, 2)}
            />
            <RangeField
              label="Effective tax rate"
              hint="Flat combined income and payroll tax applied to gross income. A single rate is a simplification — real brackets and local taxes vary a lot."
              value={assumptions.effectiveTaxRate}
              onChange={(value) => onAssumptions({ effectiveTaxRate: value })}
              min={0}
              max={60}
              step={1}
              format={(value) => formatPercent(value, 0)}
            />
            <Divider />
            <SwitchField
              label="Re-scale salary to local market"
              hint="Off: your salary travels with you, which is the remote-work case. On: pay is scaled by the cost-of-living ratio between the two cities."
              checked={assumptions.adjustSalaryToLocalMarket}
              onChange={(checked) =>
                onAssumptions({ adjustSalaryToLocalMarket: checked })
              }
            />
          </div>
        </Section>

        <Section
          title="Inflation by category"
          description="A multiplier on each city's headline inflation. Medical and education have historically run hotter than the headline rate."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {EXPENSE_CATEGORIES.map((category) => (
              <div key={category}>
                <FieldLabel
                  htmlFor={`${uid}-infl-${category}`}
                  hint={`Inflation multiplier for ${EXPENSE_LABELS[category].toLowerCase()}. 1× tracks the city's headline rate.`}
                  hintAlign="start"
                >
                  {EXPENSE_SHORT_LABELS[category]} inflation
                </FieldLabel>
                <NumberInput
                  id={`${uid}-infl-${category}`}
                  value={assumptions.categoryInflation[category]}
                  onChange={(value) =>
                    onAssumptions({
                      categoryInflation: {
                        ...assumptions.categoryInflation,
                        [category]: value,
                      },
                    })
                  }
                  suffix="×"
                  step={0.1}
                  min={0}
                  max={4}
                />
              </div>
            ))}
          </div>
        </Section>

        <CitySection
          side="A"
          profile={locationA}
          currency={currency}
          onLocation={onLocation}
          onExpense={onExpense}
        />

        <CitySection
          side="B"
          profile={locationB}
          currency={currency}
          onLocation={onLocation}
          onExpense={onExpense}
        />
      </div>
    </Sheet>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-bold tracking-tight text-fg">{title}</h3>
      {description && (
        <p className="mb-4 mt-1 text-xs leading-relaxed text-fg-muted">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

function CitySection({
  side,
  profile,
  currency,
  onLocation,
  onExpense,
}: {
  side: Side;
  profile: LocationProfile;
  currency: string;
  onLocation: (side: Side, partial: Partial<LocationProfile>) => void;
  onExpense: (side: Side, category: ExpenseCategory, value: number) => void;
}) {
  const total = sumExpenses(profile.expenses);
  const uid = useId();
  const fieldId = (name: string) => `${uid}-${side}-${name}`;

  return (
    <section className="rounded-lg border border-line bg-surface-2/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight text-fg">
          <span aria-hidden>{flagEmoji(profile.countryCode)}</span>
          <span className="truncate">{profile.name}</span>
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            side === "A"
              ? "border-city-a/25 bg-city-a/10 text-city-a"
              : "border-city-b/25 bg-city-b/10 text-city-b"
          )}
        >
          {side === "A" ? "Current" : "New"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <FieldLabel
            htmlFor={fieldId("col")}
            hint="City-level cost-of-living index, 100 = US national average. This is what re-prices the whole budget."
          >
            COL index
          </FieldLabel>
          <NumberInput
            id={fieldId("col")}
            value={profile.colIndex}
            onChange={(value) => onLocation(side, { colIndex: value })}
            step={1}
            min={5}
            max={400}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor={fieldId("inflation")}
            hint="Annual headline inflation for this city, before the per-category multipliers above."
          >
            Inflation
          </FieldLabel>
          <NumberInput
            id={fieldId("inflation")}
            value={profile.inflationRate}
            onChange={(value) => onLocation(side, { inflationRate: value })}
            suffix="%"
            step={0.1}
            min={0}
            max={100}
          />
        </div>
        <div>
          <FieldLabel
            htmlFor={fieldId("ppp")}
            hint="Price level versus the US (1.00 = US prices) at market exchange rates. Used only for the international-dollars comparison."
            hintAlign="end"
          >
            Price level
          </FieldLabel>
          <NumberInput
            id={fieldId("ppp")}
            value={profile.useManualPpp ? profile.manualPppRatio : profile.pppIndex}
            onChange={(value) =>
              onLocation(side, {
                pppIndex: value,
                manualPppRatio: value,
                useManualPpp: false,
              })
            }
            step={0.01}
            min={0.05}
            max={3}
          />
        </div>
      </div>

      <div className="mt-4">
        <FieldLabel
          htmlFor={fieldId("contribution")}
          hint="Extra money arriving each month on top of your salary: employer match, vesting equity, rental or side income."
        >
          Extra monthly contribution
        </FieldLabel>
        <MoneyInput
          id={fieldId("contribution")}
          value={profile.monthlySavingsContribution}
          onChange={(value) =>
            onLocation(side, { monthlySavingsContribution: value })
          }
          currency={currency}
        />
      </div>

      <p className="mb-3 mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
        Monthly budget
        <InfoTip
          content="These start from the cost model — income share by category, re-priced by the local cost-of-living index. Edit any line and it stops auto-updating."
          align="start"
        />
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {EXPENSE_CATEGORIES.map((category) => (
          <div key={category}>
            <FieldLabel
              htmlFor={fieldId(category)}
              hint={EXPENSE_HINTS[category]}
              hintAlign="start"
            >
              {EXPENSE_LABELS[category]}
              {profile.overriddenCategories.includes(category) && (
                <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                  edited
                </span>
              )}
            </FieldLabel>
            <MoneyInput
              id={fieldId(category)}
              value={profile.expenses[category]}
              onChange={(value) => onExpense(side, category, value)}
              currency={currency}
            />
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-fg-muted">
        Total monthly spend:{" "}
        <span className="tabular font-bold text-fg">
          {formatCurrency(total, currency)}
        </span>
      </p>
    </section>
  );
}
