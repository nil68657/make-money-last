"use client";

import {
  BarChart3,
  Globe2,
  Layers,
  LineChart,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { CompareCard, type CompareCardValues } from "./CompareCard";
import { Badge } from "@/components/ui/primitives";
import { CITIES, getCityById } from "@/lib/cities";
import { cn, flagEmoji } from "@/lib/format";
import type { CityRecord } from "@/lib/types";

/** Curated starting points, chosen to show a range of outcomes. */
const QUICK_ROUTES: { from: string; to: string; label: string }[] = [
  { from: "us-new-york-ny", to: "pt-lisbon", label: "New York → Lisbon" },
  { from: "us-san-francisco-ca", to: "us-austin-tx", label: "SF → Austin" },
  { from: "gb-london", to: "es-barcelona", label: "London → Barcelona" },
  { from: "us-seattle-wa", to: "in-bangalore", label: "Seattle → Bangalore" },
  { from: "us-chicago-il", to: "mx-mexico-city", label: "Chicago → Mexico City" },
];

export function LandingView({
  values,
  onChange,
  onSwap,
  onSubmit,
  submitting,
}: {
  values: CompareCardValues;
  onChange: (partial: Partial<CompareCardValues>) => void;
  onSwap: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const countries = new Set(CITIES.map((city) => city.countryCode)).size;

  const routes = QUICK_ROUTES.map((route) => ({
    ...route,
    fromCity: getCityById(route.from),
    toCity: getCityById(route.to),
  })).filter(
    (route): route is typeof route & { fromCity: CityRecord; toCity: CityRecord } =>
      Boolean(route.fromCity && route.toCity)
  );

  return (
    <>
      <section className="mesh-hero relative overflow-hidden">
        <div
          aria-hidden
          className="grid-lines pointer-events-none absolute inset-0 opacity-70"
        />
        <div
          aria-hidden
          className="animate-float-slow pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-city-b/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-content px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="brand" className="animate-in-up">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Cost of living, PPP and inflation in one model
            </Badge>

            <h1 className="animate-in-up stagger-1 mt-6 text-display-sm font-bold tracking-tight text-fg text-balance sm:text-display lg:text-display-lg">
              See how far your money goes —{" "}
              <span className="gradient-text">and how long it lasts</span> — when
              you move.
            </h1>

            <p className="animate-in-up stagger-2 mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-muted text-pretty sm:text-lg">
              Compare two cities on the numbers that actually decide the move:
              what your monthly budget becomes, how long your savings survive, and
              what inflation quietly takes from both.
            </p>
          </div>

          <div className="animate-in-up stagger-3 mx-auto mt-10 max-w-4xl">
            <CompareCard
              values={values}
              onChange={onChange}
              onSwap={onSwap}
              onSubmit={onSubmit}
              submitting={submitting}
            />
          </div>

          <div className="animate-in-up stagger-4 mx-auto mt-7 max-w-4xl">
            <p className="mb-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              Or start from a popular move
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {routes.map((route) => {
                const active =
                  values.cityA?.id === route.fromCity.id &&
                  values.cityB?.id === route.toCity.id;
                return (
                  <button
                    key={route.label}
                    type="button"
                    onClick={() =>
                      onChange({ cityA: route.fromCity, cityB: route.toCity })
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition duration-200 ease-spring hover:-translate-y-0.5",
                      active
                        ? "border-brand/30 bg-brand/10 text-brand"
                        : "border-line bg-surface text-fg-muted shadow-xs hover:border-line-strong hover:text-fg"
                    )}
                  >
                    <span aria-hidden>
                      {flagEmoji(route.fromCity.countryCode)}
                      {flagEmoji(route.toCity.countryCode)}
                    </span>
                    {route.label}
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="animate-in-up stagger-5 mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4 border-t border-line pt-8">
            <Stat value={`${CITIES.length}`} label="Cities" />
            <Stat value={`${countries}`} label="Countries" />
            <Stat value="0" label="Sign-ups required" />
          </dl>
        </div>
      </section>

      <section className="border-t border-line bg-surface-2/40">
        <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-display-sm font-bold tracking-tight text-fg text-balance">
              A cost-of-living calculator that keeps going
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-fg-muted text-pretty">
              Most calculators stop at &ldquo;this city is 32% cheaper&rdquo;. That
              is the beginning of the question, not the answer.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Feature
              icon={LineChart}
              title="Runway, not just ratios"
              body="A month-by-month projection of your actual balance, with investment returns on what's left and per-category expense inflation on what goes out."
            />
            <Feature
              icon={BarChart3}
              title="Line-item comparison"
              body="Housing swings hardest when you move; groceries and medical premiums barely budge. The category view shows which costs really change."
            />
            <Feature
              icon={TrendingDown}
              title="What inflation takes"
              body="A nominal balance that looks healthy in 20 years can be worth far less in real terms. Both views sit on the same chart."
            />
            <Feature
              icon={Globe2}
              title="Global by default"
              body={`${CITIES.length} cities across ${countries} countries, from US metros to Lisbon, Bangalore, Dubai and Mexico City — with country price levels for each.`}
            />
            <Feature
              icon={Layers}
              title="Nothing hidden"
              body="Every assumption — tax rate, raises, returns, inflation, cost-of-living index, and every budget line — is editable and documented."
            />
            <Feature
              icon={Sparkles}
              title="Instant and private"
              body="The whole model runs in your browser. No account, no upload, no waiting on a server."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="tabular block text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {value}
        </span>
        <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </span>
      </dd>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Globe2;
  title: string;
  body: string;
}) {
  return (
    <div className="card-sheen group rounded-xl border border-line bg-surface p-5 shadow-sm transition duration-300 ease-spring hover:-translate-y-1 hover:shadow-lg">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand/20 bg-brand/10 text-brand transition duration-300 ease-spring group-hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-4 text-[15px] font-bold tracking-tight text-fg">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
