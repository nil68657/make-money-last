"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { LandingView } from "./landing/LandingView";
import { CompareCard, type CompareCardValues } from "./landing/CompareCard";
import { ResultsSkeleton, ResultsView } from "./results/ResultsView";
import { AssumptionsDrawer, type Side } from "./AssumptionsDrawer";
import { DetailsSheet } from "./DetailsSheet";
import { Sheet } from "./ui/Sheet";
import { ThemeToggle } from "./ui/ThemeToggle";
import { Button } from "./ui/primitives";
import {
  DEFAULT_CITY_A_ID,
  DEFAULT_CITY_B_ID,
  getCityById,
  CITIES,
} from "@/lib/cities";
import {
  buildLocationProfile,
  incomeForDestination,
  retargetLineItemCurrency,
  retargetLocationProfile,
} from "@/lib/cost-model";
import { formatDateInput, runComparison } from "@/lib/simulation";
import {
  convertAmount,
  convertForEntry,
  FALLBACK_FX,
  fxRate,
  type FxSnapshot,
} from "@/lib/fx";
import { useFx } from "./fx-provider";
import {
  Assumptions,
  CityRecord,
  DEFAULT_ASSUMPTIONS,
  ExpenseLineItem,
  LocationProfile,
  SimulationInputs,
} from "@/lib/types";

/** Seed figures, quoted in USD and converted into each field's own currency. */
const DEFAULT_SAVINGS_USD = 250_000;
const DEFAULT_INCOME_USD = 150_000;
const DEFAULT_HORIZON_MONTHS = 360;

/** Brief pause before revealing results, so the skeleton reads as work, not lag. */
const CALCULATE_DELAY_MS = 520;

function fallbackCity(id: string): CityRecord {
  return getCityById(id) ?? CITIES[0];
}

/**
 * Bring the balance the user already holds into the destination currency. This
 * is the *only* place an exchange rate touches the model — everything after it
 * is a single-currency calculation.
 */
function convertSavings(
  savings: number,
  cityA: CityRecord,
  cityB: CityRecord,
  fx: FxSnapshot
): Pick<SimulationInputs, "currentSavings" | "savingsConversion"> {
  return {
    currentSavings: convertAmount(savings, cityA.currency, cityB.currency, fx),
    savingsConversion: {
      enteredAmount: savings,
      enteredCurrency: cityA.currency,
      rate: fxRate(cityA.currency, cityB.currency, fx),
      ratesAsOf: fx.asOf,
      ratesSource: fx.source,
    },
  };
}

/**
 * The user enters income in the destination currency, so City A's income is
 * derived from it rather than the other way round. With salary re-scaling off
 * both sides carry the same figure (the salary travels with you); with it on,
 * City A's is the destination figure walked back down the cost-of-living ratio.
 */
function incomeForOrigin(
  destinationIncome: number,
  cityA: CityRecord,
  cityB: CityRecord,
  assumptions: Assumptions
): number {
  return incomeForDestination(
    destinationIncome,
    cityB.colIndex,
    cityA.colIndex,
    assumptions.adjustSalaryToLocalMarket
  );
}

function buildInputs(
  cityA: CityRecord,
  cityB: CityRecord,
  savings: number,
  income: number,
  assumptions: Assumptions,
  fx: FxSnapshot
): SimulationInputs {
  const displayCurrency = cityB.currency;
  return {
    asOfDate: formatDateInput(new Date()),
    displayCurrency,
    fx,
    ...convertSavings(savings, cityA, cityB, fx),
    projectionMonths: DEFAULT_HORIZON_MONTHS,
    locationA: buildLocationProfile(
      cityA,
      incomeForOrigin(income, cityA, cityB, assumptions),
      displayCurrency
    ),
    locationB: buildLocationProfile(cityB, income, displayCurrency),
    assumptions,
  };
}

export function SimulatorApp() {
  const { fx } = useFx();

  // Seeded from the bundled table rather than live rates so the first render is
  // identical on server and client.
  const [form, setForm] = useState<CompareCardValues>(() => {
    const cityA = fallbackCity(DEFAULT_CITY_A_ID);
    const cityB = fallbackCity(DEFAULT_CITY_B_ID);
    return {
      cityA,
      cityB,
      savings: convertForEntry(DEFAULT_SAVINGS_USD, "USD", cityA.currency, FALLBACK_FX),
      income: convertForEntry(DEFAULT_INCOME_USD, "USD", cityB.currency, FALLBACK_FX),
    };
  });

  const [inputs, setInputs] = useState<SimulationInputs | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const resultsAnchor = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const result = useMemo(
    () => (inputs ? runComparison(inputs) : null),
    [inputs]
  );

  /**
   * A typed amount means nothing without its unit, so when a city change moves
   * a field to a different currency the figure moves with it. Leaving "150,000"
   * in place while the prefix flips from $ to ¥ would silently turn a salary
   * into a tenth of one.
   */
  const updateForm = useCallback(
    (partial: Partial<CompareCardValues>) => {
      setForm((prev) => {
        const next = { ...prev, ...partial };
        if (
          partial.cityA &&
          prev.cityA &&
          partial.cityA.currency !== prev.cityA.currency
        ) {
          next.savings = convertForEntry(
            prev.savings,
            prev.cityA.currency,
            partial.cityA.currency,
            fx
          );
        }
        if (
          partial.cityB &&
          prev.cityB &&
          partial.cityB.currency !== prev.cityB.currency
        ) {
          next.income = convertForEntry(
            prev.income,
            prev.cityB.currency,
            partial.cityB.currency,
            fx
          );
        }
        return next;
      });
    },
    [fx]
  );

  const swapCities = useCallback(() => {
    setForm((prev) => {
      const { cityA, cityB } = prev;
      if (!cityA || !cityB) return { ...prev, cityA: cityB, cityB: cityA };
      return {
        cityA: cityB,
        cityB: cityA,
        savings: convertForEntry(prev.savings, cityA.currency, cityB.currency, fx),
        income: convertForEntry(prev.income, cityB.currency, cityA.currency, fx),
      };
    });
  }, [fx]);

  /**
   * Rebuilds the simulation from the form. Keeps existing assumptions so a user
   * who tuned the model and then changed a city doesn't lose their settings.
   */
  const applyForm = useCallback(
    (
      values: CompareCardValues,
      existing: SimulationInputs | null,
      rates: FxSnapshot
    ) => {
      const cityA = values.cityA ?? fallbackCity(DEFAULT_CITY_A_ID);
      const cityB = values.cityB ?? fallbackCity(DEFAULT_CITY_B_ID);
      const assumptions = existing?.assumptions ?? DEFAULT_ASSUMPTIONS;

      if (!existing) {
        return buildInputs(
          cityA,
          cityB,
          values.savings,
          values.income,
          assumptions,
          rates
        );
      }

      const displayCurrency = cityB.currency;
      return {
        ...existing,
        displayCurrency,
        fx: rates,
        ...convertSavings(values.savings, cityA, cityB, rates),
        locationA: retargetLocationProfile(
          existing.locationA,
          cityA,
          incomeForOrigin(values.income, cityA, cityB, assumptions),
          { displayCurrency }
        ),
        locationB: retargetLocationProfile(
          existing.locationB,
          cityB,
          values.income,
          { displayCurrency }
        ),
      };
    },
    []
  );

  const handleCalculate = useCallback(() => {
    setCalculating(true);
    setEditOpen(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setInputs((prev) => applyForm(form, prev, fx));
      setCalculating(false);
      requestAnimationFrame(() => {
        resultsAnchor.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }, CALCULATE_DELAY_MS);
  }, [applyForm, form, fx]);

  const patchLocation = useCallback(
    (side: Side, partial: Partial<LocationProfile>) => {
      setInputs((prev) => {
        if (!prev) return prev;
        const key = side === "A" ? "locationA" : "locationB";
        return { ...prev, [key]: { ...prev[key], ...partial } };
      });
    },
    []
  );

  /** Rewrites one side's rows through `update`, leaving everything else alone. */
  const patchLineItems = useCallback(
    (side: Side, update: (items: ExpenseLineItem[]) => ExpenseLineItem[]) => {
      setInputs((prev) => {
        if (!prev) return prev;
        const key = side === "A" ? "locationA" : "locationB";
        const profile = prev[key];
        return {
          ...prev,
          [key]: { ...profile, lineItems: update(profile.lineItems) },
        };
      });
    },
    []
  );

  const patchLineItem = useCallback(
    (side: Side, id: string, partial: Partial<ExpenseLineItem>) => {
      patchLineItems(side, (items) =>
        items.map((item) =>
          item.id === id ? { ...item, ...partial, overridden: true } : item
        )
      );
    },
    [patchLineItems]
  );

  const changeLineItemCurrency = useCallback(
    (side: Side, id: string, currency: string) => {
      patchLineItems(side, (items) =>
        items.map((item) =>
          item.id === id ? retargetLineItemCurrency(item, currency, fx) : item
        )
      );
    },
    [patchLineItems, fx]
  );

  const addLineItem = useCallback(
    (side: Side) => {
      setInputs((prev) => {
        if (!prev) return prev;
        const key = side === "A" ? "locationA" : "locationB";
        const profile = prev[key];
        const item: ExpenseLineItem = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          category: "misc",
          label: "",
          amount: 0,
          currency: prev.displayCurrency,
          overridden: true,
          custom: true,
        };
        return {
          ...prev,
          [key]: { ...profile, lineItems: [...profile.lineItems, item] },
        };
      });
    },
    []
  );

  const removeLineItem = useCallback(
    (side: Side, id: string) => {
      patchLineItems(side, (items) => items.filter((item) => item.id !== id));
    },
    [patchLineItems]
  );

  const moveLineItem = useCallback(
    (side: Side, id: string, direction: -1 | 1) => {
      patchLineItems(side, (items) => {
        const from = items.findIndex((item) => item.id === id);
        const to = from + direction;
        if (from === -1 || to < 0 || to >= items.length) return items;
        const next = [...items];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      });
    },
    [patchLineItems]
  );

  const patchAssumptions = useCallback((partial: Partial<Assumptions>) => {
    setInputs((prev) => {
      if (!prev) return prev;
      const assumptions = { ...prev.assumptions, ...partial };

      // Income is entered against the destination, so re-scaling to the local
      // market moves City A's figure — and with it every non-overridden
      // expense line on that side.
      if (
        partial.adjustSalaryToLocalMarket !== undefined &&
        partial.adjustSalaryToLocalMarket !==
          prev.assumptions.adjustSalaryToLocalMarket
      ) {
        const cityA = getCityById(prev.locationA.cityId);
        const incomeA = incomeForDestination(
          prev.locationB.annualIncome,
          prev.locationB.colIndex,
          prev.locationA.colIndex,
          assumptions.adjustSalaryToLocalMarket
        );
        if (cityA) {
          return {
            ...prev,
            assumptions,
            locationA: retargetLocationProfile(prev.locationA, cityA, incomeA, {
              resetInflationAndPpp: false,
            }),
          };
        }
      }

      return { ...prev, assumptions };
    });
  }, []);

  const patchInputs = useCallback((partial: Partial<SimulationInputs>) => {
    setInputs((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const resetAssumptions = useCallback(() => {
    setInputs((prev) => {
      if (!prev) return prev;
      const cityA = getCityById(prev.locationA.cityId);
      const cityB = getCityById(prev.locationB.cityId);
      if (!cityA || !cityB) return prev;
      // Rebuild from the amount the user originally typed, so the FX step is
      // re-applied once rather than compounding onto an already-converted sum.
      return buildInputs(
        cityA,
        cityB,
        prev.savingsConversion.enteredAmount,
        prev.locationB.annualIncome,
        DEFAULT_ASSUMPTIONS,
        fx
      );
    });
  }, [fx]);

  return (
    <div className="min-h-dvh">
      <header className="glass-strong sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-[4.25rem] max-w-content items-center justify-between gap-4 px-4 sm:px-6">
          <a
            href="#top"
            className="flex items-center gap-2.5 rounded-sm outline-none"
          >
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-brand to-accent text-white shadow-md">
              <Compass className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-fg">
                Make Money Last
              </span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-fg-subtle sm:block">
                Relocation runway simulator
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            {result && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInputs(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Start over
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="top">
        <div ref={resultsAnchor} />

        {!result && !calculating && (
          <LandingView
            values={form}
            onChange={updateForm}
            onSwap={swapCities}
            onSubmit={handleCalculate}
            submitting={calculating}
          />
        )}

        {calculating && <ResultsSkeleton />}

        {result && inputs && !calculating && (
          <ResultsView
            result={result}
            inputs={inputs}
            onEdit={() => setEditOpen(true)}
            onAssumptions={() => setAssumptionsOpen(true)}
            onDetails={() => setDetailsOpen(true)}
          />
        )}
      </main>

      <footer className="border-t border-line bg-surface-2/40">
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
          <p className="text-xs leading-relaxed text-fg-subtle">
            Cost-of-living indices, purchasing-power price levels and default
            inflation rates are approximate reference figures for comparison only.
            Not financial advice.
          </p>
        </div>
      </footer>

      {inputs && (
        <>
          <Sheet
            open={editOpen}
            onClose={() => setEditOpen(false)}
            side="center"
            widthClass="sm:max-w-2xl"
            title="Edit your comparison"
            description="Change either city, your savings or your income."
          >
            <CompareCard
              variant="sheet"
              values={form}
              onChange={updateForm}
              onSwap={swapCities}
              onSubmit={handleCalculate}
              submitting={calculating}
            />
          </Sheet>

          <AssumptionsDrawer
            open={assumptionsOpen}
            onClose={() => setAssumptionsOpen(false)}
            inputs={inputs}
            onInputs={patchInputs}
            onAssumptions={patchAssumptions}
            onLocation={patchLocation}
            onLineItem={patchLineItem}
            onLineItemCurrency={changeLineItemCurrency}
            onAddLineItem={addLineItem}
            onRemoveLineItem={removeLineItem}
            onMoveLineItem={moveLineItem}
            onReset={resetAssumptions}
          />

          {result && (
            <DetailsSheet
              open={detailsOpen}
              onClose={() => setDetailsOpen(false)}
              result={result}
              inputs={inputs}
            />
          )}
        </>
      )}
    </div>
  );
}
