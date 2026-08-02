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
import { InfoTip } from "@/components/ui/InfoTip";
import {
  ChartSkeleton,
  LegendChip,
  TooltipCard,
  compactAxisCurrency,
  useChart,
} from "./chart-parts";

/** Which lens on the balance to draw. */
type PowerMode = "both" | "real" | "nominal" | "intl";

/**
 * The same balance under three different questions, which the app is careful
 * never to conflate:
 *
 *   nominal  what the statement says
 *   real     what it buys where you live, once this city's own inflation over
 *            the projection is divided out
 *   intl     what it buys anywhere, once the country's price level is divided
 *            out too — the only one of the three that can be compared between
 *            two countries, because market exchange rates do not equalise what
 *            money actually buys
 *
 * The gap between nominal and real is inflation quietly eating the pile, the
 * most under-appreciated part of a long runway. The gap between real and
 * international is the reason a smaller balance in a cheaper country can be
 * the better outcome.
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

  const showIntl = mode === "intl";
  const showReal = mode === "both" || mode === "real";
  const showNominal = mode === "both" || mode === "nominal";

  const nameA = result.locationA.locationName;
  const nameB = result.locationB.locationName;
  const seriesNoun = showIntl ? "international $" : showReal ? "real" : "nominal";

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
          <LegendChip color={theme.cityA} label={`${nameA} — ${seriesNoun}`} />
          <LegendChip color={theme.cityB} label={`${nameB} — ${seriesNoun}`} />
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
            {
              value: "intl",
              label: "Intl $",
              name: "International dollars only",
            },
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
                  aIntl: number;
                  bIntl: number;
                };
                const lost = point.b > 0 ? (1 - point.bReal / point.b) * 100 : 0;
                const rows = [
                  showIntl && {
                    label: `${nameB} — international $`,
                    value: formatCurrency(point.bIntl, currency),
                    color: theme.cityB,
                  },
                  showIntl && {
                    label: `${nameA} — international $`,
                    value: formatCurrency(point.aIntl, currency),
                    color: theme.cityA,
                  },
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
                      showIntl
                        ? "Buying power on a common price level"
                        : mode === "nominal"
                          ? "Nominal balance, before inflation"
                          : "Real value in today's local prices"
                    }
                    rows={rows}
                    footer={
                      showIntl
                        ? "Price levels divided out, so the two are directly comparable"
                        : `Inflation has eaten ${formatPercent(Math.max(0, lost), 0)} of buying power in ${nameB}`
                    }
                  />
                );
              }}
            />

            {showIntl && (
              <Area
                type="monotone"
                dataKey="aIntl"
                stroke={theme.cityA}
                strokeWidth={2.25}
                fill="url(#realA)"
                dot={false}
                animationDuration={850}
              />
            )}
            {showIntl && (
              <Area
                type="monotone"
                dataKey="bIntl"
                stroke={theme.cityB}
                strokeWidth={2.25}
                fill="url(#realB)"
                dot={false}
                animationDuration={850}
              />
            )}

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

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
          {nameB} at the end, three ways
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Lens
            label="Nominal"
            value={formatCurrency(finalPoint?.b ?? 0, currency, true)}
            tip="What the statement would say. No adjustment of any kind — the figure that flatters longest."
          />
          <Lens
            label="Real, local prices"
            value={formatCurrency(finalPoint?.bReal ?? 0, currency, true)}
            tip={`The same balance divided by ${nameB}'s own cumulative inflation, so it is stated in today's prices. This is an adjustment over time inside one country; it says nothing about how far the money goes anywhere else.`}
          />
          <Lens
            label="International dollars"
            value={formatCurrency(finalPoint?.bIntl ?? 0, currency, true)}
            tip={`Divided again by the country price level — ${nameB} sits at ${result.locationB.pppIndex.toFixed(2)}× US prices. Exchange rates convert units but do not equalise what money buys, so this is the only figure that can be set against the other city's directly.`}
          />
        </div>
      </div>
    </div>
  );
}

/** One labelled lens on the end balance, with the distinction spelled out. */
function Lens({
  label,
  value,
  tip,
}: {
  label: string;
  value: string;
  tip: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        {label}
        <InfoTip content={tip} align="start" />
      </p>
      <p className="tabular mt-1 text-lg font-bold text-fg">{value}</p>
    </div>
  );
}
