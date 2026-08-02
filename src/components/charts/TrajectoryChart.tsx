"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildTrajectoryData, yearTicks } from "@/lib/chart-data";
import { formatCurrency, formatMonths } from "@/lib/format";
import type { ComparisonResult } from "@/lib/types";
import {
  ChartSkeleton,
  LegendChip,
  TooltipCard,
  compactAxisCurrency,
  useChart,
} from "./chart-parts";

/**
 * Side-by-side savings trajectory. Gradient-filled areas rather than plain
 * lines, so the "how much is left" quantity reads at a glance, with a marker on
 * each depletion point.
 */
export function TrajectoryChart({
  result,
  currency,
  height = 340,
}: {
  result: ComparisonResult;
  currency: string;
  height?: number;
}) {
  const { theme, ready } = useChart();
  const data = useMemo(() => buildTrajectoryData(result), [result]);
  const ticks = useMemo(() => yearTicks(data), [data]);

  const nameA = result.locationA.locationName;
  const nameB = result.locationB.locationName;

  const depletionA = result.locationA.runwayMonths;
  const depletionB = result.locationB.runwayMonths;

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
        <LegendChip color={theme.warning} label="Savings depleted" dashed />
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillA" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={theme.cityA}
                  stopOpacity={theme.areaOpacity[0]}
                />
                <stop
                  offset="100%"
                  stopColor={theme.cityA}
                  stopOpacity={theme.areaOpacity[1]}
                />
              </linearGradient>
              <linearGradient id="fillB" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={theme.cityB}
                  stopOpacity={theme.areaOpacity[0]}
                />
                <stop
                  offset="100%"
                  stopColor={theme.cityB}
                  stopOpacity={theme.areaOpacity[1]}
                />
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
                  monthIndex: number;
                  a: number;
                  b: number;
                };
                return (
                  <TooltipCard
                    title={point.date}
                    subtitle={
                      point.monthIndex === 0
                        ? "Starting balance"
                        : `Month ${point.monthIndex} · ${formatMonths(point.monthIndex)} in`
                    }
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
                    footer={`Gap: ${formatCurrency(point.b - point.a, currency)}`}
                  />
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="a"
              stroke={theme.cityA}
              strokeWidth={2.25}
              fill="url(#fillA)"
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: theme.surface,
                fill: theme.cityA,
              }}
              isAnimationActive
              animationDuration={850}
            />
            <Area
              type="monotone"
              dataKey="b"
              stroke={theme.cityB}
              strokeWidth={2.25}
              fill="url(#fillB)"
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: theme.surface,
                fill: theme.cityB,
              }}
              isAnimationActive
              animationDuration={850}
            />

            {depletionA !== null && (
              <ReferenceDot
                x={depletionA}
                y={0}
                r={5}
                fill={theme.cityA}
                stroke={theme.surface}
                strokeWidth={2}
                isFront
              />
            )}
            {depletionB !== null && (
              <ReferenceDot
                x={depletionB}
                y={0}
                r={5}
                fill={theme.cityB}
                stroke={theme.surface}
                strokeWidth={2}
                isFront
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
