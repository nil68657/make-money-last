"use client";

import { useId } from "react";
import { ArrowLeftRight, ArrowRight, Loader2 } from "lucide-react";
import { CityCombobox } from "@/components/CityCombobox";
import { Button } from "@/components/ui/primitives";
import { FieldLabel, MoneyInput } from "@/components/ui/Field";
import { FxNote } from "@/components/ui/FxNote";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/format";
import type { CityRecord } from "@/lib/types";

export interface CompareCardValues {
  cityA: CityRecord | null;
  cityB: CityRecord | null;
  savings: number;
  income: number;
}

/** A blocking problem with the form, plus the field to send the user back to. */
interface Problem {
  field: "cityA" | "cityB" | "savings" | "income";
  title: string;
  description: string;
}

/**
 * Returns the first thing standing between the user and a projection. One
 * problem at a time keeps the toast stack readable and the fix obvious.
 */
function findProblem(values: CompareCardValues): Problem | null {
  if (!values.cityA) {
    return {
      field: "cityA",
      title: "Pick your current city",
      description:
        "It sets the baseline budget, and the currency your savings are held in today.",
    };
  }
  if (!values.cityB) {
    return {
      field: "cityB",
      title: "Pick a destination city",
      description: "Choose where you're thinking of moving to.",
    };
  }
  if (values.cityA.id === values.cityB.id) {
    return {
      field: "cityB",
      title: "Choose two different cities",
      description: `Comparing ${values.cityA.city} with itself won't tell you anything.`,
    };
  }
  if (!(values.savings > 0)) {
    return {
      field: "savings",
      title: "Add your current savings",
      description:
        "Runway counts down from a starting balance, so it can't be zero.",
    };
  }
  return null;
}

/**
 * The entry widget: two city typeaheads, two money fields, one CTA. Used at full
 * size on the landing page and again inside an overlay on the results page so
 * the inputs never have to be re-learned.
 */
export function CompareCard({
  values,
  onChange,
  onSwap,
  onSubmit,
  submitting = false,
  variant = "hero",
  className,
}: {
  values: CompareCardValues;
  onChange: (partial: Partial<CompareCardValues>) => void;
  onSwap: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  variant?: "hero" | "sheet";
  className?: string;
}) {
  const isHero = variant === "hero";
  // Savings are held where you live now; income is what you'd earn where you're
  // going. They are genuinely different units until FX brings them together.
  const homeCurrency = values.cityA?.currency ?? "USD";
  const destinationCurrency = values.cityB?.currency ?? homeCurrency;
  const crossCurrency = homeCurrency !== destinationCurrency;

  const { toast } = useToast();
  const uid = useId();
  const fieldIds = {
    cityA: `${uid}-city-a`,
    cityB: `${uid}-city-b`,
    savings: `${uid}-savings`,
    income: `${uid}-income`,
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const problem = findProblem(values);
    if (problem) {
      toast({
        tone: "error",
        title: problem.title,
        description: problem.description,
      });
      document.getElementById(fieldIds[problem.field])?.focus();
      return;
    }

    // The starting budget is derived from income, so zero income also means
    // zero estimated expenses. That's a valid place to start from — you then
    // enter real expenses by hand — but it surprises people, so say so.
    if (values.income === 0) {
      toast({
        tone: "warning",
        title: "Projecting with no income",
        description:
          "Expenses are estimated from income, so they all start at zero. Set them yourself in the assumptions drawer.",
      });
    }

    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        isHero &&
          "card-sheen mesh-panel rounded-2xl border border-line bg-surface/95 p-5 shadow-xl backdrop-blur-xl sm:p-7",
        className
      )}
    >
      {/* The swap control sits between the two comboboxes at every width; the
          dropdown's higher stacking context keeps it from being obscured. */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-3">
        <CityCombobox
          id={fieldIds.cityA}
          label="Current city"
          tone="a"
          value={values.cityA}
          onChange={(city) => onChange({ cityA: city })}
          hint="Where you live today. This sets the baseline budget, and the currency your existing savings are held in."
        />

        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap cities"
          title="Swap cities"
          className="group mx-auto -my-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg-muted shadow-sm transition duration-300 ease-spring hover:border-brand hover:text-brand lg:my-0 lg:mb-1"
        >
          <ArrowLeftRight
            className="h-4 w-4 transition duration-300 ease-spring group-hover:rotate-180"
            aria-hidden
          />
        </button>

        <CityCombobox
          id={fieldIds.cityB}
          label="New city"
          tone="b"
          value={values.cityB}
          onChange={(city) => onChange({ cityB: city })}
          hint="Where you're thinking of moving. Its currency is what every projected figure is shown in, and your savings are converted into it at the market rate."
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor={fieldIds.savings}
            hint="Liquid savings and investments you could actually live on. Excludes home equity and locked retirement accounts."
          >
            Current savings{crossCurrency && ` (${homeCurrency})`}
          </FieldLabel>
          <MoneyInput
            id={fieldIds.savings}
            size="lg"
            value={values.savings}
            currency={homeCurrency}
            onChange={(value) => onChange({ savings: value })}
            placeholder="250,000"
          />
        </div>
        <div>
          <FieldLabel
            htmlFor={fieldIds.income}
            hint={`Gross household income before tax, in ${destinationCurrency} — the currency of the city you're moving to, which is what every projected figure is shown in. The simulator applies an effective tax rate you can change in the assumptions drawer.`}
            hintAlign="end"
          >
            Pre-tax household income{crossCurrency && ` (${destinationCurrency})`}
          </FieldLabel>
          <MoneyInput
            id={fieldIds.income}
            size="lg"
            value={values.income}
            currency={destinationCurrency}
            onChange={(value) => onChange({ income: value })}
            placeholder="150,000"
            suffix="/ yr"
          />
        </div>
      </div>

      {crossCurrency && <FxNote from={homeCurrency} to={destinationCurrency} />}

      {/* Deliberately never disabled for an incomplete form: pressing it is how
          the user finds out what's missing. */}
      <Button
        type="submit"
        size={isHero ? "xl" : "lg"}
        disabled={submitting}
        className="mt-5 w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4.5 w-4.5 animate-spin" aria-hidden />
            Running projection…
          </>
        ) : (
          <>
            {isHero ? "Calculate my runway" : "Update projection"}
            <ArrowRight className="h-4.5 w-4.5" aria-hidden />
          </>
        )}
      </Button>

      {isHero && (
        <p className="mt-3.5 text-center text-xs leading-relaxed text-fg-subtle">
          Runs entirely in your browser. Nothing is uploaded, no account needed.
        </p>
      )}
    </form>
  );
}
