"use client";

import { useId, useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { MoneyInput } from "./ui/Field";
import { InfoTip } from "./ui/InfoTip";
import { Button } from "./ui/primitives";
import { useFx } from "./fx-provider";
import { DATASET_CURRENCIES, inflationForCurrency } from "@/lib/cities";
import { convertAmount } from "@/lib/fx";
import { cn, currencySymbol, formatCurrency, formatPercent } from "@/lib/format";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_HINTS,
  EXPENSE_LABELS,
  type ExpenseCategory,
  type ExpenseLineItem,
} from "@/lib/types";

/**
 * The budget, one editable row at a time.
 *
 * The reason this is a list rather than a fixed grid of six money fields is
 * that a relocated household's costs are genuinely multi-currency: the EMI and
 * the school fees stay in rupees while the rent and the groceries move to
 * dollars. Every row therefore carries its own currency, shows what it comes
 * to in the display currency, and can be added, removed or reordered.
 */
export function ExpenseEditor({
  items,
  displayCurrency,
  homeCurrency,
  locationCurrency,
  onChange,
  onCurrency,
  onAdd,
  onRemove,
  onMove,
}: {
  items: ExpenseLineItem[];
  displayCurrency: string;
  /** The origin city's currency: the one alternative most rows will want. */
  homeCurrency: string;
  /** This location's own currency. */
  locationCurrency: string;
  onChange: (id: string, partial: Partial<ExpenseLineItem>) => void;
  onCurrency: (id: string, currency: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { fx } = useFx();
  const uid = useId();

  /**
   * The destination and origin currencies first, since between them they cover
   * almost every real row, then the rest of the dataset alphabetically. A flat
   * A-Z list would bury the two codes the user actually wants under sixty they
   * do not.
   */
  const currencyOptions = useMemo(() => {
    const preferred = Array.from(
      new Set([displayCurrency, homeCurrency, locationCurrency].filter(Boolean))
    );
    const rest = DATASET_CURRENCIES.filter((code) => !preferred.includes(code));
    return { preferred, rest };
  }, [displayCurrency, homeCurrency, locationCurrency]);

  const total = items.reduce(
    (sum, item) =>
      sum + convertAmount(item.amount, item.currency, displayCurrency, fx),
    0
  );
  const foreign = items.filter(
    (item) => item.amount > 0 && item.currency !== displayCurrency
  );

  return (
    <div>
      <div className="mb-3 mt-5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
          Monthly budget
          <InfoTip
            content="Rows start from the cost model — a share of income per category, re-priced by the local cost-of-living index. Edit any amount and it stops auto-updating. Set a row's currency to whatever you actually pay it in."
            align="start"
          />
        </p>
        <Button variant="ghost" size="sm" onClick={onAdd} type="button">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add line
        </Button>
      </div>

      <ul className="space-y-2">
        {items.map((item, index) => (
          <LineItemRow
            key={item.id}
            item={item}
            index={index}
            count={items.length}
            uid={uid}
            displayCurrency={displayCurrency}
            currencyOptions={currencyOptions}
            onChange={onChange}
            onCurrency={onCurrency}
            onRemove={onRemove}
            onMove={onMove}
          />
        ))}
      </ul>

      <p className="mt-4 text-xs text-fg-muted">
        Total monthly spend:{" "}
        <span className="tabular font-bold text-fg">
          {formatCurrency(total, displayCurrency)}
        </span>
      </p>

      {foreign.length > 0 && (
        <p className="mt-2 rounded-md border border-warning/25 bg-warning/8 px-3 py-2 text-[11px] leading-relaxed text-warning">
          <span className="font-bold">
            {foreign.length} row{foreign.length === 1 ? "" : "s"} in a foreign
            currency.
          </span>{" "}
          These are not fixed costs. A payment that never changes in{" "}
          {foreign[0].currency} still moves in {displayCurrency} whenever the
          rate does, and that risk sits with you. Set an expected annual drift
          in the projection settings above to model it.
        </p>
      )}
    </div>
  );
}

function LineItemRow({
  item,
  index,
  count,
  uid,
  displayCurrency,
  currencyOptions,
  onChange,
  onCurrency,
  onRemove,
  onMove,
}: {
  item: ExpenseLineItem;
  index: number;
  count: number;
  uid: string;
  displayCurrency: string;
  currencyOptions: { preferred: string[]; rest: string[] };
  onChange: (id: string, partial: Partial<ExpenseLineItem>) => void;
  onCurrency: (id: string, currency: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const { fx } = useFx();
  const fieldId = (name: string) => `${uid}-${item.id}-${name}`;
  const isForeign = item.currency !== displayCurrency;
  const converted = convertAmount(
    item.amount,
    item.currency,
    displayCurrency,
    fx
  );
  const name = item.label || EXPENSE_LABELS[item.category];

  return (
    <li className="rounded-md border border-line bg-surface p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        {item.custom ? (
          <input
            id={fieldId("label")}
            aria-label={`Name for custom budget line ${index + 1}`}
            value={item.label}
            placeholder="What is this line?"
            onChange={(event) => onChange(item.id, { label: event.target.value })}
            className="min-w-0 flex-1 rounded-sm border-b border-dashed border-line-strong bg-transparent pb-0.5 text-[13px] font-semibold text-fg outline-none transition placeholder:font-normal placeholder:text-fg-subtle focus:border-brand focus:border-solid"
          />
        ) : (
          <label
            htmlFor={fieldId("amount")}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-semibold text-fg-muted"
          >
            <span className="truncate">{EXPENSE_LABELS[item.category]}</span>
            <InfoTip content={EXPENSE_HINTS[item.category]} align="start" />
            {item.overridden && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-brand">
                edited
              </span>
            )}
          </label>
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={`Move ${name} up`}
            disabled={index === 0}
            onClick={() => onMove(item.id, -1)}
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
          </IconButton>
          <IconButton
            label={`Move ${name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(item.id, 1)}
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          </IconButton>
          {item.custom && (
            <IconButton
              label={`Remove ${name}`}
              tone="danger"
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </IconButton>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <MoneyInput
          id={fieldId("amount")}
          className="min-w-0 flex-1"
          value={item.amount}
          currency={item.currency}
          onChange={(value) => onChange(item.id, { amount: value })}
        />

        <div className="shrink-0">
          <label htmlFor={fieldId("currency")} className="sr-only">
            Currency for {name}
          </label>
          <select
            id={fieldId("currency")}
            value={item.currency}
            onChange={(event) => onCurrency(item.id, event.target.value)}
            className={cn(
              "h-11 rounded-md border bg-surface px-2 text-sm font-semibold text-fg outline-none transition duration-200",
              "hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/12",
              isForeign ? "border-warning/50 text-warning" : "border-line"
            )}
          >
            {currencyOptions.preferred.map((code) => (
              <option key={code} value={code}>
                {code} {currencySymbol(code)}
              </option>
            ))}
            {currencyOptions.rest.length > 0 && (
              <optgroup label="Other currencies">
                {currencyOptions.rest.map((code) => (
                  <option key={code} value={code}>
                    {code} {currencySymbol(code)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Showing the converted figure next to the entered one is the only way
          the user can tell a sane conversion from a broken one. */}
      {isForeign && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-fg-subtle">
          = <span className="tabular font-semibold text-fg-muted">
            {formatCurrency(converted, displayCurrency)}
          </span>{" "}
          today · inflates at {formatPercent(inflationForCurrency(item.currency), 1)}{" "}
          ({item.currency} economy), not the local rate
        </p>
      )}

      {item.custom && (
        <div className="mt-2">
          <label htmlFor={fieldId("category")} className="sr-only">
            Category for {name}
          </label>
          <select
            id={fieldId("category")}
            value={item.category}
            onChange={(event) =>
              onChange(item.id, {
                category: event.target.value as ExpenseCategory,
              })
            }
            className="h-8 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-fg-muted outline-none transition hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/12"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                Grouped under: {EXPENSE_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-fg-subtle transition duration-200",
        "hover:border-line hover:bg-surface-2 hover:text-fg",
        "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/12",
        "disabled:pointer-events-none disabled:opacity-30",
        tone === "danger" && "hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
      )}
    >
      {children}
    </button>
  );
}
