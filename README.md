# nepse-summary-frontend

The web UI for [nepse-api](../nepse-api). It provides symbol search, a live quote panel, and an interactive candlestick chart with volume, SMA, EMA, RSI and MACD.

It is a standalone project with its own `package.json` and `node_modules`, and shares nothing with the backend except the HTTP API.

**Stack:** React 19, TypeScript (strict), Vite 7, Tailwind CSS 4, TanStack Query 5, React Router 7, and TradingView Lightweight Charts 5.

---

## Requirements

- Node.js 20.19 or newer
- A running **nepse-api** with some synced data. See `../nepse-api/docs/RUNNING.md`.

## Run it

```powershell
cd "D:\Saksham full stack\Nepse-summary\nepse-summary-frontend"
npm install
Copy-Item .env.example .env      # optional: the defaults work with a local backend on port 3000
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173. If 5173 is busy, Vite uses the next free port; that's fine because API calls go through the dev proxy, not CORS.

Start the backend first (`npm run dev` in `nepse-api`). The header badge shows whether the API is reachable and when data was last synced.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload and the `/api` proxy |
| `npm run build` | Typecheck, then build static files to `dist/` |
| `npm run preview` | Serve the production build locally (proxy included) |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit tests (Vitest) |

### Configuration (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Where the browser sends API calls. Keep the default to use the proxy, or set a full URL for a separately hosted API. |
| `VITE_API_PROXY_TARGET` | `http://localhost:3000` | Backend address for the dev/preview proxy |
| `VITE_QUOTE_POLL_MS` | `60000` | Quote polling interval while the tab is visible |
| `VITE_ADMIN_APP_URL` | `http://localhost:5174` | The nepse-admin portal, linked from the account menu |

`VITE_*` values are baked into the build at build time, so rebuild after changing them.

---

## Features

| Feature | Backend endpoint |
| --- | --- |
| API / database / last-sync status badge (polls every 60 s) | `GET /health` |
| Symbol search with keyboard navigation; instrument list with filter | `GET /instruments?search=` |
| Instrument header: name, sector, type, stored history range | `GET /instruments/:symbol` |
| Quote panel: LTP, change, volume, 52-week range, freshness and market-status badges; polls while visible | `GET /market-data/:symbol/quote` |
| Candles or close-price line, volume pane, 1D/1W/1M intervals, 3M–All ranges | `GET /market-data/:symbol/candles` |
| Infinite scroll-back: dragging to the left edge loads the previous page via `before=nextBefore` | same |
| SMA and EMA overlays; RSI (30/70 guides) and MACD panes; periods editable | `GET /indicators/:symbol` |
| Table view of the loaded candles, with a "Load older" button | uses the same data |

### Chart behaviour

- **Responsibilities.** The backend provides data. Crosshair, zoom, pan, pane resizing and styling are handled here by Lightweight Charts.
- **Shareable URLs.** Interval, range and chart type are kept in the URL, e.g. `/instrument/NABIL?interval=1w&range=1Y&type=line`. Symbols containing `/` (e.g. `NICD83/84`) are URL-encoded.
- **Aligned indicators.** Indicator values are requested for exactly the same pages as the candles, so they line up as you scroll back. Warm-up is handled by the backend; if history is too short, a note appears below the chart.
- **Provisional candles.** A candle captured while the market was open is marked "Provisional" on the chart, in the legend and in the table.
- **States.** The UI distinguishes these cases:
  - unknown symbol
  - no data stored yet (with the `npm run sync` command to run)
  - no data in the selected range
  - API unreachable
  - database down
  - stale or failed quote refresh

### Colour and accessibility

- **Candle colours.** Conventional green/red candles can't be told apart with red-green colour blindness; the palette validator measured ΔE 4.1. Direction is therefore always encoded by shape too: **rising candles are hollow, falling candles are filled**. Text changes always show ▲/▼ and a +/− sign.
- **Colour-blind-safe option.** *Settings → Candle colours → Colour-blind safe* switches to blue/red, which passes validation in both themes.
- **Indicator lines.** These use a validated blue/orange pair. Volume, RSI and MACD each get their own pane instead of a second y-axis.
- **Themes.** Light and dark themes follow the OS by default and can be changed in *Settings*. Preferences are stored per browser.
- **Hover legend.** The legend over the chart shows the exact values under the crosshair and names every series.

## Member area and platform admin

The market-data pages above stay public. Signed-in features live under their own routes and load as separate chunks, so visitors don't download them. How the money works (units, NAV, late fees) is described in nepse-api's README under *Accounts and portfolios*.

| Route | What it is |
| --- | --- |
| `/login`, `/register` | Sign in or create an account. A platform admin gets a **Sign in as admin** button after logging in. |
| `/app` | Member home: one card per portfolio (group, solo or managed) with its value and your share; your net worth; alerts (payment due or late, deposit approved or rejected, new trades, exit updates); invitations to accept. |
| `/app/portfolios/:id` | **Dashboard:** group totals (invested, value, profit in Rs and %, cash, NAV), your numbers (contributed, units, ownership, share value, returns), a growth-over-time chart (group, or just you), and a breakdown by asset type or sector. |
| `…/deposit` | **Pay this month:** amount (late fee included), due date, and the group's bank or eSewa details. Upload a screenshot and follow it through pending, approved, or rejected with the reason. Full history with PDF receipts. |
| `…/contributions` | Your monthly paid / pending / due / late calendar, plus the group tracker if the admin shares it. |
| `…/holdings`, `…/holdings/:id` | What the group owns, with quantity, average buy price, current price and P/L. Each asset has its own page with notes, documents and its transactions. |
| `…/activity` | Read-only feed of buys, sells, dividends, bonus and right shares and fees, with the admin's notes. Reversed entries are shown crossed out. |
| `…/statements` | Monthly statements as PDF. |
| `…/exit` | Payout estimate at the current NAV, the exit request, and its status. |
| `…/members` | Who is in the group and their roles. Units and shares appear only if the admin allows it. You can also report a problem to the platform team here. |
| `/app/settings` | Profile, password, notification preferences, language (English / नेपाली), dark mode. Saved to your account. |
| `/platform-admin` | Platform admins only, after **Sign in as admin**. Usage stats (users, portfolios, AUM), users (suspend, delete, grant admin), portfolios (suspend, delete, **view as admin** opens nepse-admin read-only), NEPSE price sync and corrections, abuse reports, the global audit log, and a placeholder for plans and billing. |

Admins and leaders also get an **Admin portal** link to the separate [nepse-admin](../nepse-admin) app, set by `VITE_ADMIN_APP_URL` (default `http://localhost:5174`). Both apps call the API through their own dev proxy on `localhost`, and browsers share cookies across ports, so signing in on one signs you in on the other.

The member area's text is in `src/features/i18n/messages.ts`. TypeScript checks that the English and Nepali sets have the same keys. Platform admin pages are English only.

---

## Project structure

```
src/
  main.tsx                     entry point
  index.css                    Tailwind + theme tokens (light/dark)
  app/
    App.tsx                    providers + routes (instrument page is lazy-loaded)
    ErrorBoundary.tsx
    routes.ts                  URL helpers
  config/env.ts                VITE_* settings
  types/api.ts                 response types mirroring nepse-api
  lib/                         api client, formatting, dates, storage, query client, error text
  components/
    layout/                    AppLayout (header/footer), SettingsMenu
    ui/                        Card, SegmentedControl, StatusBadge, States, Spinner, ChangeIndicator
  features/
    health/                    /health query + header status badge
    instruments/               search, list, header
    market-data/               candles (infinite) + quote queries, QuoteCard
    chart/
      components/              ChartPanel, PriceChart, ChartLegend, ChartToolbar,
                               IndicatorSettingsPanel, CandleTable
      hooks/                   use-indicator-series (page-aligned indicator queries)
      lib/                     chart colours, indicator settings, page merging, series mapping
    preferences/               theme, candle scheme, indicator settings (localStorage)
  pages/                       HomePage, InstrumentPage, NotFoundPage
tests/                         Vitest unit tests
```

---

## Deploying

`npm run build` produces static files in `dist/`. Any static host works, but it must:

1. **Fall back to `index.html`** for unknown paths, so `/instrument/NABIL` works on reload. For example, with nginx: `try_files $uri /index.html;`
2. **Reach the API.** Either:
   - serve the API under the same origin at `/api` with a reverse proxy, keeping `VITE_API_BASE_URL=/api/v1`, or
   - set `VITE_API_BASE_URL=https://your-api.example.com/api/v1` before building, and add the site's origin to the backend's `CORS_ORIGINS`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Header shows **API offline** | Start nepse-api (`npm run dev` there), and check `VITE_API_PROXY_TARGET` matches its port |
| **Database down** badge | The backend can't reach MySQL; see the backend's troubleshooting guide |
| **Never synced** / empty charts | Run `npm run db:seed` and `npm run sync` in nepse-api |
| "Unexpected response… non-JSON" | `VITE_API_BASE_URL` points at something that isn't nepse-api |
| Indicator says "not enough history yet" | Expected for new installs; history grows by one candle per trading day, or import a CSV backfill |
| Port 5173 already in use | Vite automatically uses the next port; use the URL it prints |

## What was verified

- **Checks:** `npm run typecheck`, `npm test` (15 tests) and `npm run build` pass.
- **Rendering:** checked with headless Chrome screenshots against a mock of the nepse-api response contract, in light and dark themes, with all indicators on, at a 390 px phone width, and for the no-data state.
- **Not yet tested:** against the real nepse-api with a MySQL database, since none was available in the build environment.
