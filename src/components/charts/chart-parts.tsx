"use client";

import { useTheme } from "@/components/theme-provider";
import { getChartTheme, type ChartTheme } from "@/lib/chart-theme";
import { cn, formatCurrency } from "@/lib/format";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Charts read their palette from the resolved theme rather than CSS variables,
 * because Recharts gradient stops need literal colour strings. `mounted` gates
 * the first render so a dark-mode reload never paints light-mode axes.
 */
export function useChart(): { theme: ChartTheme; ready: boolean } {
  const { theme, mounted } = useTheme();
  return { theme: getChartTheme(theme), ready: mounted };
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full flex-col justify-end gap-3", className)}>
      <Skeleton className="h-3 w-24" />
      <div className="flex flex-1 items-end gap-2">
        {[42, 58, 36, 72, 51, 84, 63, 92].map((height, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  dashed?: boolean;
  muted?: boolean;
}

/** Shared tooltip shell so every chart reads identically. */
export function TooltipCard({
  title,
  subtitle,
  rows,
  footer,
}: {
  title: string;
  subtitle?: string;
  rows: TooltipRow[];
  footer?: React.ReactNode;
}) {
  return (
    <div className="pointer-events-none min-w-[11rem] rounded-md border border-line bg-surface/95 p-3 shadow-xl backdrop-blur-md">
      <p className="text-[13px] font-bold tracking-tight text-fg">{title}</p>
      {subtitle && (
        <p className="mt-0.5 text-[11px] font-medium text-fg-subtle">{subtitle}</p>
      )}
      <div className="mt-2.5 space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              {row.color && (
                <span
                  aria-hidden
                  className="h-0.5 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: row.dashed ? "transparent" : row.color,
                    borderTop: row.dashed ? `2px dashed ${row.color}` : undefined,
                  }}
                />
              )}
              <span
                className={cn(
                  "truncate",
                  row.muted ? "text-fg-subtle" : "text-fg-muted"
                )}
              >
                {row.label}
              </span>
            </span>
            <span className="tabular shrink-0 font-bold text-fg">{row.value}</span>
          </div>
        ))}
      </div>
      {footer && (
        <div className="mt-2.5 border-t border-line pt-2 text-[11px] text-fg-subtle">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Legend chip used above charts, in place of Recharts' default legend. */
export function LegendChip({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted">
      <span
        aria-hidden
        className="h-0.5 w-4 shrink-0 rounded-full"
        style={{
          backgroundColor: dashed ? "transparent" : color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
        }}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function compactAxisCurrency(currency: string) {
  return (value: number) => {
    if (value === 0) return "0";
    return formatCurrency(value, currency, true);
  };
}
