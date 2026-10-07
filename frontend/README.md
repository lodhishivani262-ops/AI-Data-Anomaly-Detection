# Anomaly Copilot — Phase 2 (Frontend)

A Next.js + TypeScript + Tailwind dashboard for the Phase 1 FastAPI anomaly-detection
backend, plus a server-side AI investigation layer.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Recharts · Lucide icons

## Setup

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL if the backend isn't on :8000
npm run dev
```

Open `http://localhost:3000`. The Phase 1 backend must be running (see `backend/README.md`)
at the URL configured in `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

```bash
npm run build   # production build
npm run lint    # eslint
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | Base URL of the FastAPI backend. The only backend address the frontend ever uses — never hard-coded in components. |
| `ANTHROPIC_API_KEY` | **backend** `.env` (not frontend!) | Enables real AI-generated explanations in `/api/investigation/chat`. Without it, the endpoint still works and returns the structured evidence, just without an LLM-written explanation. |

No secrets are ever read by the frontend or exposed via `NEXT_PUBLIC_*` variables.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — start a new upload or jump to an existing dataset ID |
| `/upload` | Drag-and-drop CSV/XLSX upload with progress, validation, success/error states |
| `/dashboard/[datasetId]` | Overview — KPI cards, activity/trend chart, anomaly severity chart, amount quartile summary, category breakdown, top anomalies |
| `/dashboard/[datasetId]/anomalies` | Searchable, sortable, filterable, paginated anomaly table with a detail panel and "Investigate with AI" |
| `/dashboard/[datasetId]/quality` | Missing values, duplicates, constant/high-cardinality columns, suspicious types, invalid values — no invented quality score |
| `/dashboard/[datasetId]/trends` | Time-series chart with metric toggle, date-range sliders, and notable-change markers |
| `/dashboard/[datasetId]/investigate` | Conversational AI investigation UI with evidence cards and a context panel |

## Backend integration

All backend calls go through `lib/api.ts` — a single centralized client. No component
calls `fetch` directly against the backend.

| Function | Backend endpoint |
|---|---|
| `uploadDataset()` | `POST /api/datasets/upload` |
| `getProfile()` | `GET /api/datasets/{id}/profile` |
| `getQuality()` | `GET /api/datasets/{id}/quality` |
| `getAnomalies()` | `GET /api/datasets/{id}/anomalies` |
| `getCorrelations()` | `GET /api/datasets/{id}/correlations` |
| `getTrends()` | `GET /api/datasets/{id}/trends` |
| `getFindings()` | `GET /api/datasets/{id}/findings` |
| `runAnalysis()` | `POST /api/datasets/{id}/analyze` (used by the dashboard layout to fetch everything once and share it across tabs via `DatasetProvider`) |
| `investigate()` | `POST /api/investigation/chat` |

Every number, table, and chart on every page comes from one of these calls — nothing
is hard-coded or fabricated. Where the backend reports something as unavailable
(no datetime column for trends, insufficient rows for anomaly detection, etc.), the
page renders an explicit empty state instead of a fake chart.

### A known Phase 1 API gap this frontend works around

The backend's `/profile` endpoint returns aggregated statistics per column (mean,
min, quartiles, top categorical values) but not raw per-row values beyond the
anomaly rows themselves. A true "amount distribution" histogram would need every
row's value. The Overview page's "Amount distribution" chart is therefore a
**quartile summary** (min/Q1/median/Q3/max) built from real backend statistics
rather than a fabricated histogram — labeled as such in the UI.

## LLM architecture (Phase 2 addition to the backend)

```
Next.js (this app)
   |  POST /api/investigation/chat  { dataset_id, message, context }
   v
FastAPI  (backend/app/api/investigation.py)
   |
   v
Evidence selector (backend/app/services/evidence_selector.py)
   |  picks relevant, already-computed anomalies/findings/correlations/trends
   v
LLM client (backend/app/services/llm_client.py)
   |  calls Anthropic's Messages API server-side, with a system prompt that
   |  forbids inventing metrics or claiming fraud
   v
Evidence-grounded reply + evidence[] -> rendered in the chat UI
```

The browser never calls the LLM directly and never sees an API key. If the backend
has no `ANTHROPIC_API_KEY` configured, the endpoint degrades gracefully: it still
returns the real evidence with `llm_available: false`, and the UI shows that evidence
without a generated explanation, instead of failing.

## State management

No external state library. Local component state (`useState`) handles filters,
pagination, upload state, and the chat transcript. A single React Context
(`lib/dataset-context.tsx`) fetches `runAnalysis()` once per dataset in the
dashboard layout and shares the result across all dashboard tabs, so switching
tabs doesn't re-run the whole analysis pipeline.

## Responsive design

Sidebar navigation collapses to a mobile drawer + bottom tab bar under the `lg`
breakpoint. Tables scroll horizontally on small screens. Charts use Recharts'
`ResponsiveContainer` throughout.

## Remaining issues / things to verify in your own environment

- This was built and build/type/lint-checked against a live Phase 1 backend
  running locally, but **not visually verified in a real browser** in this
  environment (no headless browser available here) — please do a manual
  click-through after `npm run dev`.
- AI investigation replies are evidence-only until `ANTHROPIC_API_KEY` is set on
  the backend; set it to get real LLM-generated explanations.
- Google Fonts (`next/font/google`) was removed in favor of a system font stack
  because this sandboxed environment couldn't reach `fonts.googleapis.com` during
  build -- feel free to reinstate `next/font/google` if your deployment environment
  has outbound access to Google Fonts.
