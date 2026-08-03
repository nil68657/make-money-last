# Make Money Last

**[Try it live → nil68657.github.io/make-money-last](https://nil68657.github.io/make-money-last/)**

A relocation runway simulator. Pick the city you live in, the city you're thinking of
moving to, and how much you have — then see how long your savings last in each, month
by month, and whether the move actually leaves you better off.

Everything runs in the browser. No account, no sign-in, and no data you enter ever
leaves the page — there is no backend to send it to. The one outbound request is for
current exchange rates, which carries none of your inputs and is not required: block it
and the app falls back to a bundled snapshot and keeps working.

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

### Currency: one unit, and FX applied exactly once

Everything is reported in the currency of the city you are moving *to*, because that is
where the decision lands. Income is entered in that currency too — pick Tokyo and the
income field relabels itself to `¥` — and the savings you already hold are converted
into it once, on entry, at the market rate. The results header keeps the provenance
visible (`Savings €277.9K (from $320K)`) so the conversion is never silent.

FX touches the opening balance and any budget row you deliberately leave in another
currency. It never touches a price level. Every cost in the projection is re-priced by
**cost-of-living index**, not by exchange rate.

### Four quantities that must not collapse into each other

Almost every mistake this model can make is one of these being mistaken for another, so
they are named separately in the code and applied in a fixed order:

| | What it asks | Where it applies |
|---|---|---|
| **FX** | What does my money *exchange* for? | Opening balance, and foreign-currency budget rows. A unit conversion, once. |
| **Inflation** | What does it buy here *later*? | Re-prices the basket month by month. Deflating the balance by it gives the **real** balance, in this city's month-0 prices. |
| **PPP** | What does it buy *elsewhere*? | Country price level against the US. Dividing by it gives **international dollars**, the only figure comparable across a border. |
| **Market return** | What does it *earn*? | Grows the invested share at the destination country's own market rate. Nominal, never inflation-adjusted before compounding. |

Inflation and PPP are the pair most easily confused, because both are called "adjusting
for prices". One is across *time* within a country; the other is across *countries* at a
moment. Applying both composes cleanly and double-counts nothing.

This model got that wrong until recently, and it is worth recording how: a field called
`pppAdjustedSavings` was in fact an inflation deflator, and the comparison subtracted two
of them across a border without the price levels ever entering. On a Zürich-to-Mumbai run
the answer moves 418% once they do. The three balances are now `savings`, `realSavings`
and `intlSavings`, and the app shows all three side by side rather than picking one and
labelling it vaguely.

Collapsing FX and PPP is the other classic bug — it charges the cost difference twice,
once through the exchange rate and again through the local price level. `npm run
verify:model` holds the line on all of it: changing the display currency must leave the
runway unchanged, two cities in one country must see no PPP effect at all, zero inflation
must make real and nominal coincide, and dividing the price level back out must land
exactly on the real series.

### Where the rates come from

Live rates come from [open.er-api.com](https://open.er-api.com) (no key, no inputs sent),
cached in `localStorage` for 12 hours, with in-flight requests deduplicated so a fetch
never fires per keystroke or per render.

**The network can never gate the first paint.** Server and client both render from a
bundled 63-currency snapshot, so hydration matches exactly; live rates are fetched in an
effect afterwards and swapped in only if they arrive. If the request fails, is blocked,
or times out after 6 seconds, the app keeps the bundled snapshot and carries on. The rate
line under the form always names which is in use — `rates as of 2 Aug 2026, 00:02 UTC`,
or an explicit note that the offline snapshot is active.

Zero-decimal currencies are handled properly: `¥1,234,567` and `₩1,235` never render
minor units, and INR uses lakh grouping (`₹1,23,45,678`).

### Budget lines keep their own currency

A relocated household's costs are not all in one currency. Move Bangalore → Seattle and
the home-loan EMI and school fees stay in rupees while rent and groceries switch to
dollars. So the budget is a list of rows rather than a fixed grid, and each row carries
its own currency, with the origin currency offered first in the picker. Rows can be
added, removed and reordered, and named freely.

A foreign row shows its converted equivalent underneath, so the conversion can be
checked at a glance, and it inflates at **its own economy's rate** — an Indian school
raises fees at Indian inflation whether or not the family has moved. It is also not
treated as a fixed cost: an optional FX drift assumption models the risk that a payment
which never changes in rupees changes every year in dollars. It defaults to zero, with
the inflation gap that relative PPP would imply shown alongside as a reference point.

Categories are rent, food, medical, school, utilities, savings, discretionary,
miscellaneous and other. The three newer ones were carved out of what "other" already
absorbed rather than added on top, so naming them does not silently shorten a runway.

### Invested savings grow at the destination's market rate

A US 401(k) and an Indian SIP are not the same asset, so each side of the comparison
compounds at its own country's broad equity return: 10% for the S&P 500, ~12% for the
Nifty 50, 8% for the FTSE All-Share, and so on across 84 countries, with a global blend
for markets too small to assume an index for. Every default is editable.

The figures come from the **UBS Global Investment Returns Yearbook** (Dimson, Marsh &
Staunton), whose 1900–2023 real returns avoid survivorship bias by including markets that
went to zero, combined with each country's inflation assumption; supported by Damodaran's
S&P 500 series for the US and the NSE Nifty 50 TRI for India. Full sourcing, including
what is weak about the shorter records, is in the header of `src/lib/market-data.ts`.
These are century-scale averages, not forecasts.

Only the share you hold in the market earns — cash earns nothing — and the return is
nominal. Real return is shown beside it via Fisher, `(1 + real) = (1 + nominal) / (1 +
inflation)`, not by subtracting the two, and it is derived for display only. Feeding it
back into the balance while also inflating the basket would deflate twice. India's higher
nominal return coming out *lower* in real terms than the US is the point of showing both.

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
| `npm run dev:bg` | Same server, detached, so it outlives the shell that started it |
| `npm run dev:stop` / `dev:status` / `dev:restart` | Manage the detached server |
| `npm run build` | Static export into `out/` |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run health` | Is the server down, or is the app broken? Answers it in one command |
| `npm run verify` | Drives a real browser through 41 end-to-end checks (needs a running server; `--base` targets any URL) |
| `npm run verify:model` | Compiles and runs `scripts/verify-model.ts` — 134 assertions over the dataset, the city search, formatting, the cost model, currency handling, market returns and the projection engine |

## Deployment

The live site is a **static export** — `next build` with `output: "export"` emits plain
HTML, CSS and JS into `out/`, which GitHub Pages serves as files. There is no Node
process behind it, so nothing may depend on a server at request time. The app uses no
server-only features, which is what makes this possible; the Next image optimizer is
the one server route in play and is disabled via `images.unoptimized`.

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which builds the export and publishes it with the official Pages actions.

Because the site is a *project* page it is served from a `/make-money-last/` prefix, so
the build sets `basePath` and `assetPrefix`. That prefix is gated behind a `GITHUB_PAGES`
environment variable which only the workflow sets — applying it locally would break
`next dev`. To reproduce the deployed build:

```bash
GITHUB_PAGES=true npm run build   # -> out/, asset URLs prefixed with /make-money-last
```

`public/.nojekyll` ships in the export to stop Pages passing the output through Jekyll,
which would strip the `_next/` directory and leave the page unstyled.

The end-to-end suite is deliberately **not** part of the deploy workflow — it needs a
running server, and including it would only make deploys flaky. Point it at the
deployed site instead:

```bash
npm run verify -- --base https://nil68657.github.io/make-money-last
```

## Project structure

```
.github/workflows/
└── deploy.yml                # Static export -> GitHub Pages on push to main
scripts/
├── verify-app.mjs            # 39 end-to-end browser checks
├── verify-model.ts           # Headless assertions over data + model
├── dev-server.mjs            # Detached dev server (start/stop/status)
└── health-check.mjs          # Server down vs app broken
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
- Exchange rates are fetched once per session and cached for 12 hours, so a rate shown
  can be up to half a day old — and is the bundled snapshot if the request fails.

Directional model for comparing two options. Not financial advice.
