"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  as: Tag = "div",
  interactive = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section" | "article";
  interactive?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "card-sheen rounded-xl border border-line bg-surface shadow-sm",
        interactive &&
          "transition duration-300 ease-spring hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight text-fg">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-fg shadow-md hover:bg-brand-hover hover:shadow-lg active:translate-y-px",
  secondary:
    "bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong",
  outline:
    "border border-line-strong bg-transparent text-fg hover:bg-surface-2",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px] rounded-sm",
  md: "h-10 gap-2 px-4 text-sm rounded-md",
  lg: "h-12 gap-2 px-6 text-[15px] rounded-lg",
  xl: "h-14 gap-2.5 px-8 text-base rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition duration-200 ease-spring disabled:pointer-events-none disabled:opacity-45",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------- Badge */

type Tone = "neutral" | "brand" | "positive" | "negative" | "warning" | "cityA" | "cityB";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-line",
  brand: "bg-brand/10 text-brand border-brand/20",
  positive: "bg-positive/10 text-positive border-positive/20",
  negative: "bg-negative/10 text-negative border-negative/20",
  warning: "bg-warning/10 text-warning border-warning/25",
  cityA: "bg-city-a/10 text-city-a border-city-a/25",
  cityB: "bg-city-b/10 text-city-b border-city-b/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Small square icon chip used on metric cards. */
export function IconChip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border",
        toneStyles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------- SegmentedControl */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  /**
   * `label` may collapse to an icon at narrow widths, so `name` carries the
   * accessible name that has to survive that.
   */
  options: { value: T; label: React.ReactNode; name?: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  // Plain pressed-state buttons rather than a tablist: a real tablist commits us
  // to arrow-key navigation and linked tabpanels, and this control is used in
  // places that have neither.
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.name}
            title={option.name}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-sm font-semibold transition duration-200 ease-spring",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-[13px]",
              active
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton */

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        "animate-shimmer rounded-sm bg-surface-3 bg-[length:250%_100%]",
        "bg-[linear-gradient(90deg,transparent_0%,rgb(var(--surface))_45%,transparent_90%)]",
        className
      )}
    />
  );
}

/* --------------------------------------------------------- AnimatedNumber */

const EASE_OUT_EXPO = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Counts from the previous value to the next one. Skips the animation entirely
 * when the user prefers reduced motion, and on the very first render so the
 * hero number doesn't spin up from zero on a page load.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 900,
  className,
  animateOnMount = true,
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
  className?: string;
  animateOnMount?: boolean;
}) {
  const [display, setDisplay] = useState(animateOnMount ? 0 : value);
  const fromRef = useRef(animateOnMount ? 0 : value);
  const frameRef = useRef<number>();

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || duration <= 0) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(from + (value - from) * EASE_OUT_EXPO(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  return <span className={cn("tabular", className)}>{format(display)}</span>;
}

/* -------------------------------------------------------------- DeltaPill */

export function DeltaPill({
  value,
  format,
  invert = false,
  className,
}: {
  value: number;
  format: (value: number) => string;
  /** When true, a negative number is the good outcome (e.g. cost of living). */
  invert?: boolean;
  className?: string;
}) {
  const isGood = invert ? value <= 0 : value >= 0;
  const neutral = Math.abs(value) < 0.05;
  return (
    <Badge
      tone={neutral ? "neutral" : isGood ? "positive" : "negative"}
      className={className}
    >
      {format(value)}
    </Badge>
  );
}

/* ---------------------------------------------------------------- Divider */

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
