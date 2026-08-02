"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { useFx } from "@/components/fx-provider";
import { formatRatesAsOf, fxRate } from "@/lib/fx";
import { cn } from "@/lib/format";

/**
 * States the exchange rate in force and where it came from. Live and bundled
 * rates are visually distinct on purpose: a stale snapshot silently standing in
 * for a live rate is the kind of thing a user should never have to guess at.
 */
export function FxNote({
  from,
  to,
  className,
}: {
  from: string;
  to: string;
  className?: string;
}) {
  const { fx } = useFx();
  if (!from || !to || from === to) return null;

  const rate = fxRate(from, to, fx);
  const isFallback = fx.source === "fallback";
  const pretty = rate.toLocaleString("en-US", { maximumSignificantDigits: 6 });

  return (
    <p
      className={cn(
        "mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed",
        isFallback ? "text-warning" : "text-fg-subtle",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        {isFallback ? (
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        )}
        1 {from} = {pretty} {to}
      </span>
      <span className={isFallback ? undefined : "text-fg-subtle"}>
        {isFallback
          ? "· using the bundled offline snapshot — live rates unavailable"
          : `· ${fx.source === "cache" ? "cached live" : "live"} rates as of ${formatRatesAsOf(fx.asOf)}`}
      </span>
    </p>
  );
}
