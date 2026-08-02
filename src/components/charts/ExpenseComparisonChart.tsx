"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildCategoryData } from "@/lib/chart-data";
import { formatCurrency, formatSignedPercent } from "@/lib/format";
import type { ComparisonResult } from "@/lib/types";
import {
  ChartSkeleton,
  LegendChip,
  TooltipCard,
  compactAxisCurrency,
  useChart,
} from "./chart-parts";

/**
 * Grouped bars showing how each spending category shifts between the two
 * cities. Grouped rather than stacked, because the interesting question is
 * "which line items get cheaper", not "what does the total look like".
 */
export function ExpenseComparisonChart({
  result,
  currency,
  height = 300,
}: {
  result: ComparisonResult;
  currency: string;
  height?: number;
}) {
  const { theme, ready } = useChart();
  const data = useMemo(() => buildCategoryData(result), [result]);

  const nameA = result.locationA.locationName;
  const nameB = result.locationB.locationName;

  if (!ready) {
    return (
      <div style={{ height }}>
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <LegendChip color={theme.cityA} label={nameA} />
        <LegendChip color={theme.cityB} label={nameB} />
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
            barGap={4}
            barCategoryGap="26%"
          >
            <CartesianGrid
              stroke={theme.grid}
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="short"
              tick={{ fill: theme.axis, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: theme.axisLine }}
              tickMargin={10}
              interval={0}
            />
            <YAxis
              tickFormatter={compactAxisCurrency(currency)}
              tick={{ fill: theme.axis, fontSize: 11, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={54}
            />
            <Tooltip
              cursor={{ fill: theme.grid, fillOpacity: 0.45 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as {
                  label: string;
                  a: number;
                  b: number;
                  deltaPercent: number | null;
                };
                return (
                  <TooltipCard
                    title={point.label}
                    subtitle="Monthly, at today's prices"
                    rows={[
                      {
                        label: nameA,
                        value: formatCurrency(point.a, currency),
                        color: theme.cityA,
                      },
                      {
                        label: nameB,
                        value: formatCurrency(point.b, currency),
                        color: theme.cityB,
                      },
                    ]}
                    footer={
                      point.deltaPercent === null
                        ? "No baseline to compare"
                        : `${formatSignedPercent(point.deltaPercent, 0)} vs ${nameA}`
                    }
                  />
                );
              }}
            />
            <Bar
              dataKey="a"
              fill={theme.cityA}
              radius={[5, 5, 0, 0]}
              maxBarSize={38}
              animationDuration={700}
            />
            <Bar
              dataKey="b"
              radius={[5, 5, 0, 0]}
              maxBarSize={38}
              animationDuration={700}
              animationBegin={120}
            >
              {data.map((entry) => (
                // Tint a category red when it gets *more* expensive after the
                // move, so regressions stand out inside an otherwise-cheaper city.
                <Cell
                  key={entry.short}
                  fill={
                    entry.deltaPercent !== null && entry.deltaPercent > 2
                      ? theme.negative
                      : theme.cityB
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        Bars in red are categories that cost more after the move.
      </p>
    </div>
  );
}
