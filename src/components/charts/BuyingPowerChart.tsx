"use client";

import { useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildTrajectoryData, yearTicks } from "@/lib/chart-data";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { ComparisonResult } from "@/lib/types";
import { SegmentedControl } from "@/components/ui/primitives";
import {
  ChartSkeleton,
  LegendChip,
  TooltipCard,
  compactAxisCurrency,
  useChart,
} from "./chart-parts";

/** Which of the two balance series to draw. */
type PowerMode = "both" | "real" | "nominal";

/**
 * Nominal balance (dashed) against the same balance restated in today's prices
 * (filled). The gap between the two lines is inflation quietly eating the pile,
 * which is the single most under-appreciated part of a long runway.
 */
export function BuyingPowerChart({
  result,
  currency,
  height = 340,
}: {
  result: ComparisonResult;
  currency: string;
  height?: number;
}) {
  const { theme, ready } = useChart();
  const [mode, setMode] = useState<PowerMode>("both");
  const data = useMemo(() => buildTrajectoryData(result), [result]);
  const ticks = useMemo(() => yearTicks(data), [data]);

  const showReal = mode !== "nominal";
  const showNominal = mode !== "real";

  const nameA = result.locationA.locationName;
  const nameB = result.locationB.locationName;

  const finalPoint = data[data.length - 1];
  const erosionB =
    finalPoint && finalPoint.b > 0
      ? (1 - finalPoint.bReal / finalPoint.b) * 100
      : 0;

  if (!ready) {
    return (
      <div style={{ height }}>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LegendChip
            color={theme.cityA}
            label={showReal ? `${nameA} — real` : `${nameA} — nominal`}
          />
          <LegendChip
            color={theme.cityB}
            label={showReal ? `${nameB} — real` : `${nameB} — nominal`}
          />
          {mode === "both" && (
            <LegendChip
              color={theme.muted}
              label="Nominal (before inflation)"
              dashed
            />
          )}
        </div>
        <SegmentedControl<PowerMode>
          ariaLabel="Buying power series"
          value={mode}
          onChange={setMode}
          size="sm"
          options={[
            { value: "both", label: "Both", name: "Both series" },
            { value: "real", label: "Real", name: "Real value only" },
            { value: "nominal", label: "Nominal", name: "Nominal value only" },
          ]}
        />
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="realA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.cityA} stopOpacity={0.28} />
                <stop offset="100%" stopColor={theme.cityA} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="realB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.cityB} stopOpacity={0.3} />
                <stop offset="100%" stopColor={theme.cityB} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke={theme.grid}
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="monthIndex"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={ticks}
              tickFormatter={(month: number) =>
                month === 0 ? "Now" : `${Math.round(month / 12)}y`
              }
              tick={{ fill: theme.axis, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: theme.axisLine }}
              tickMargin={10}
            />
            <YAxis
              tickFormatter={compactAxisCurrency(currency)}
              tick={{ fill: theme.axis, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={54}
            />
            <ReferenceLine
              y={0}
              stroke={theme.warning}
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />

            <Tooltip
              cursor={{ stroke: theme.axisLine, strokeWidth: 1.5 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as {
                  date: string;
                  a: number;
                  b: number;
                  aReal: number;
                  bReal: number;
                };
                const lost = point.b > 0 ? (1 - point.bReal / point.b) * 100 : 0;
                const rows = [
                  showReal && {
                    label: `${nameB} — real`,
                    value: formatCurrency(point.bReal, currency),
                    color: theme.cityB,
                  },
                  showNominal && {
                    label: `${nameB} — nominal`,
                    value: formatCurrency(point.b, currency),
                    color: mode === "nominal" ? theme.cityB : theme.muted,
                    dashed: mode === "both",
                    muted: mode === "both",
                  },
                  showReal && {
                    label: `${nameA} — real`,
                    value: formatCurrency(point.aReal, currency),
                    color: theme.cityA,
                  },
                  showNominal && {
                    label: `${nameA} — nominal`,
                    value: formatCurrency(point.a, currency),
                    color: mode === "nominal" ? theme.cityA : theme.muted,
                    dashed: mode === "both",
                    muted: mode === "both",
                  },
                ].filter(Boolean) as {
                  label: string;
                  value: string;
                  color: string;
                  dashed?: boolean;
                  muted?: boolean;
                }[];
                return (
                  <TooltipCard
                    title={point.date}
                    subtitle={
                      mode === "nominal"
                        ? "Nominal balance, before inflation"
                        : "Real value in today's prices"
                    }
                    rows={rows}
                    footer={`Inflation has eaten ${formatPercent(Math.max(0, lost), 0)} of buying power in ${nameB}`}
                  />
                );
              }}
            />

            {showReal && (
              <Area
                type="monotone"
                dataKey="aReal"
                stroke={theme.cityA}
                strokeWidth={2.25}
                fill="url(#realA)"
                dot={false}
                animationDuration={850}
              />
            )}
            {showReal && (
              <Area
                type="monotone"
                dataKey="bReal"
                stroke={theme.cityB}
                strokeWidth={2.25}
                fill="url(#realB)"
                dot={false}
                animationDuration={850}
              />
            )}

            {/* Nominal is a faint dashed reference next to real, but becomes the
                filled subject of the chart when it is the only series shown. */}
            {showNominal && mode === "nominal" ? (
              <>
                <Area
                  type="monotone"
                  dataKey="a"
                  stroke={theme.cityA}
                  strokeWidth={2.25}
                  fill="url(#realA)"
                  dot={false}
                  animationDuration={850}
                />
                <Area
                  type="monotone"
                  dataKey="b"
                  stroke={theme.cityB}
                  strokeWidth={2.25}
                  fill="url(#realB)"
                  dot={false}
                  animationDuration={850}
                />
              </>
            ) : (
              showNominal && (
                <>
                  <Line
                    type="monotone"
                    dataKey="a"
                    stroke={theme.cityA}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    strokeOpacity={0.65}
                    dot={false}
                    animationDuration={850}
                  />
                  <Line
                    type="monotone"
                    dataKey="b"
                    stroke={theme.cityB}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    strokeOpacity={0.65}
                    dot={false}
                    animationDuration={850}
                  />
                </>
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        By the end of the projection, inflation has removed{" "}
        <span className="font-semibold text-fg-muted">
          {formatPercent(Math.max(0, erosionB), 0)}
        </span>{" "}
        of the buying power of every remaining dollar in {nameB}.
      </p>
    </div>
  );
}
