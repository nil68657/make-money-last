# Make Money Last

A relocation runway simulator. Pick the city you live in, the city you're thinking of
moving to, and how much you have — then see how long your savings last in each, month
by month, and whether the move actually leaves you better off.

Everything runs in the browser. No account, no network calls, no data leaves the page.

## Quick start

```bash
cd make-money-last
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The `dev` script sets `WATCHPACK_POLLING=true`. macOS hits a file-watcher descriptor
> limit (`EMFILE`) on this project, and polling sidesteps it. Leave it in place.

## The experience

**1 — Landing.** A hero with two searchable city fields, your savings and your
household income. The city pickers are true ARIA comboboxes: filter as you type across
city, region, country and aliases (`NYC`, `Bengaluru`, `SF`), arrow-key navigation,
matched substrings highlighted, flag and cost-of-living index on every row.

**2 — Projection.** A verdict banner leads with the answer — better or worse off, and
by how much. Below it: hero metric cards with animated counters, a runway depletion
timeline, a per-category city comparison with up/down deltas, and three chart views.

**3 — Refinement.** Nothing is locked in. The assumptions drawer exposes every dial in
the model — tax rate, investment return, income growth, per-category inflation
multipliers, per-city PPP overrides, and every individual expense line. Edit a category
and it stays edited; leave it alone and it keeps tracking the derived model.

### Charts

| View | What it shows |
|------|---------------|
| **Runway** | Gradient area chart of both balances over time, with the depletion point annotated directly on the line |
| **Categories** | Side-by-side monthly spend per category for both cities |
| **Buying power** | Both balances deflated by the real basket, drawn as filled areas, with the nominal figures overlaid as dashed lines so the inflation gap is visible at a glance |

All three animate in on mount, share one custom tooltip, and reflow down to mobile.

## How the model works

### Deriving a budget

The landing page asks for four numbers, so the simulator estimates a starting budget
from income and the local cost-of-living index:

```
expense_c = grossMonthly × share_c × (colIndex / 100) ^ elasticity_c
```

`share_c` is the fraction of gross income a household at the US average spends on that
category (loosely BLS Consumer Expenditure Survey). `elasticity_c` is how hard the
category reacts to location — housing does nearly all the work (1.25), while medical
premiums (0.3) and utilities (0.35) barely move. See `src/lib/cost-model.ts`.

### Projecting forward

For each month *m*, over a 30-year horizon:

```
income(m)    = takeHome × (1 + incomeGrowth/12)^m
expense_c(m) = base_c × (1 + inflation_c/12)^m
net(m)       = income(m) − Σ expense_c(m) + contribution
balance(m)   = max(0, balance(m−1) × (1 + return/12) + net(m))
```

Per-category inflation is the city's headline rate times a category multiplier, since
medical and education have historically outpaced CPI. Runway is the first month the
balance *would* go non-positive, interpolated to a fraction of a month for the chart
marker — measured before the floor is applied, so precision isn't lost.

The balance floors at zero because you can't keep drawing from an empty account. Left
unclamped, a 30-year projection of a deficit produces a meaningless multi-million
negative figure that also wrecks the chart's y-axis. Once savings are gone the shortfall
is a cashflow problem, not a negative asset.

### One currency, no FX

Both cities are reported in the currency of your *current* city. Destination costs are
re-priced by cost-of-living index rather than converted at a market exchange rate, so
the two columns stay directly comparable and no FX assumption is ever needed.

`ppp` — a country-level price level ratio against the US — is kept separate and used
only for the international-dollars lens, which answers a different question: what a
held balance is worth in globally comparable terms.

## The city dataset

272 cities across 84 countries in `src/lib/cities.ts`. Each record carries a
cost-of-living index (100 = US average), a country price level ratio, a default
inflation rate, currency, and search aliases.

These are approximate reference figures compiled from public sources and
hand-calibrated for internal consistency — a 2024–2025 snapshot, not live data. Cost of
living varies more *within* a metro than any single index can express. They exist to
give the simulator sane defaults, and every one of them is editable.

## Design system

Semantic tokens only — components never reach for a raw palette value.

- **Tokens** live as RGB channels in `src/app/globals.css` and map to Tailwind names in
  `tailwind.config.ts`, so `/opacity` modifiers work on every colour (`bg-brand/10`).
- **Dark mode** respects `prefers-color-scheme` on first visit, persists to
  `localStorage`, and is applied by an inline `<head>` script before first paint so the
  theme never flashes.
- **Type** is Inter via `next/font`, with a tightened display scale and tabular numerals
  on every numeric readout so animated counters don't jitter.
- **Surfaces** use frosted glass for the header and overlays, a hairline top sheen on
  cards, and soft radial mesh glows behind the hero.
- **Motion** is spring-based, staggered on entry, and fully disabled under
  `prefers-reduced-motion`.

### Overlays

Sheets (centre modal and right drawer) trap focus, restore it on close, lock scroll and
close on Escape or backdrop click. Toasts announce validation errors assertively, pause
their dismiss timer on hover, and dedupe repeat submissions. Info tips explain PPP,
runway and real-vs-nominal inline wherever the terms appear.

## Accessibility

Semantic landmarks throughout; the combobox implements the full ARIA 1.2 pattern
(`aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`/`option`);
modals are `aria-modal` with labelled headings; a global `:focus-visible` ring covers
every interactive element; the calculating state announces via a live region. The
primary CTA is deliberately never disabled — pressing it is how you find out what's
missing.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · Framer Motion ·
Lucide React

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with polling file-watcher |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run verify:model` | Compiles and runs `scripts/verify-model.ts` — 62 assertions over the dataset, the city search, formatting, the cost model and the projection engine |

## Project structure

```
scripts/
└── verify-model.ts           # Headless assertions over data + model
src/
├── app/                      # Layout, tokens, page shell
├── components/
│   ├── landing/              # Hero + compare card
│   ├── results/              # Verdict, metrics, runway, comparison
│   ├── charts/               # Recharts views + shared chart parts
│   ├── ui/                   # Primitives, sheet, toast, field, theme toggle
│   ├── CityCombobox.tsx      # ARIA combobox city search
│   ├── AssumptionsDrawer.tsx # Every model dial
│   └── DetailsSheet.tsx      # Year-by-year table
└── lib/
    ├── cities.ts             # 272-city reference dataset
    ├── cost-model.ts         # Income + index → budget
    ├── simulation.ts         # Month-by-month projection engine
    ├── ppp-data.ts           # Purchasing-power helpers
    ├── chart-data.ts         # Chart series shaping
    └── chart-theme.ts        # Chart palette, mirrors the CSS tokens
```

## Limitations

- Reference data is approximate, country-level for PPP and inflation, and not live.
- Taxes are a single flat effective rate — no brackets, no state/local detail, no
  treatment of the very different tax regimes between countries.
- Relocation costs, visa constraints, healthcare system differences and property
  transactions are not modelled.
- Income growth and investment return are constant nominal rates; no sequence-of-returns
  or market volatility.

Directional model for comparing two options. Not financial advice.
