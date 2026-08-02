"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn, currencySymbol, formatWithCommas, parseNumberInput } from "@/lib/format";
import { InfoTip } from "./InfoTip";

export function FieldLabel({
  htmlFor,
  children,
  hint,
  hintAlign = "center",
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  hintAlign?: "center" | "start" | "end";
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex items-center gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[13px] font-semibold text-fg-muted"
      >
        {children}
      </label>
      {hint && <InfoTip content={hint} align={hintAlign} />}
    </div>
  );
}

const inputBase =
  "w-full rounded-md border border-line bg-surface text-fg placeholder:text-fg-subtle outline-none transition duration-200 hover:border-line-strong focus:border-brand focus:ring-4 focus:ring-brand/12";

/**
 * Money field that shows grouped digits while typing. It keeps its own display
 * string so the caret doesn't jump, and only re-syncs from the outside when the
 * field isn't focused.
 */
export function MoneyInput({
  value,
  onChange,
  currency = "USD",
  id,
  size = "md",
  placeholder,
  suffix,
  className,
  ariaDescribedBy,
}: {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  id?: string;
  size?: "md" | "lg";
  placeholder?: string;
  suffix?: string;
  className?: string;
  ariaDescribedBy?: string;
}) {
  const [text, setText] = useState(() => formatWithCommas(value));
  const focused = useRef(false);
  const symbol = currencySymbol(currency);

  useEffect(() => {
    if (!focused.current) setText(formatWithCommas(value));
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-fg-subtle",
          size === "lg" ? "text-base" : "text-sm"
        )}
      >
        {symbol}
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-describedby={ariaDescribedBy}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(formatWithCommas(value));
        }}
        onChange={(event) => {
          const raw = event.target.value;
          const next = parseNumberInput(raw);
          setText(raw === "" ? "" : formatWithCommas(next));
          onChange(Math.max(0, next));
        }}
        className={cn(
          inputBase,
          "tabular font-semibold",
          size === "lg" ? "h-13 py-3 text-base" : "h-11 text-sm",
          symbol.length > 1 ? "pl-11" : "pl-8",
          suffix ? "pr-14" : "pr-3.5"
        )}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-fg-subtle">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Compact numeric field with a unit suffix, used in the assumptions drawer. */
export function NumberInput({
  value,
  onChange,
  id,
  suffix,
  step = 0.1,
  min,
  max,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="number"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        onChange={(event) => {
          const next = parseFloat(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className={cn(inputBase, "tabular h-10 pl-3.5 text-sm", suffix && "pr-9")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-fg-subtle">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Slider + live readout. */
export function RangeField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  hint?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id} hint={hint} className="mb-0">
          {label}
        </FieldLabel>
        <span className="tabular text-sm font-semibold text-fg">
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function SwitchField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={id}
          className="cursor-pointer text-[13px] font-semibold text-fg-muted"
        >
          {label}
        </label>
        {hint && <InfoTip content={hint} align="end" />}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition duration-300 ease-spring",
          checked ? "border-brand bg-brand" : "border-line-strong bg-surface-3"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-surface shadow-sm transition duration-300 ease-spring",
            checked ? "left-[1.4rem]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
