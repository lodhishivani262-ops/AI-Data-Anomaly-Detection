# AI Data Anomaly Detection & Investigation Copilot — Backend

## Purpose / Architecture

Organizations that process transaction data (retail sales, payments, expense
logs, etc.) need a way to surface *unusual* records for human investigation
before they're buried in spreadsheets. This service is the high-performance
FastAPI backend powering the platform: upload a transaction dataset, and the
system automatically profiles it, assesses data quality, statistically detects
unusual transactions via Isolation Forest, extracts time trends and correlations,
and powers an evidence-grounded AI Copilot using Google Gemini.

All core statistical and ML analyses are computed deterministically using
pandas, NumPy, and scikit-learn. Results are served as clean JSON REST endpoints
consumed by the Next.js frontend and the AI investigation copilot.

## Architecture


```
Upload (CSV/XLSX)
      │
      ▼
Dataset Manager  ── in-memory store, keyed by dataset_id (no database)
      │              also infers column roles (numeric/categorical/
      │              datetime/identifier/quantity/unit-price/amount)
      ▼
Profiling        ── shapes, dtypes, roles, uniqueness, missingness, stats
      │
      ▼
Data Quality     ── missing values, duplicates, constant columns,
      │              high-cardinality columns, suspicious dtypes,
      │              detectable invalid values
      ▼
Feature Engineering ── numeric feature matrix: raw numeric columns +
      │                 derived date features (year/month/day/dayofweek,
      │                 hour only if timestamps carry real time-of-day info);
      │                 identifier columns are never used as features
      ▼
Anomaly Detection ── Isolation Forest over the engineered features
      │
      ▼
Correlation       ── pairwise Pearson correlation between numeric columns
      │
      ▼
Trend Analysis    ── daily/monthly aggregation + z-score based notable
      │               change detection (only if a usable datetime + amount
      │               column exist)
      ▼
Findings Engine   ── combines quality + anomaly + correlation + trend
      │               results into a single deterministic list of
      │               structured findings (no LLM)
      ▼
FastAPI JSON API  ── /api/... endpoints, OpenAPI docs at /docs
```

### Directory layout

```
backend/
├── app/
│   ├── main.py                  FastAPI app, CORS, router registration, /api/health
│   ├── api/
│   │   ├── datasets.py          POST /api/datasets/upload
│   │   ├── analysis.py          profile/quality/anomalies/correlations/trends/analyze
│   │   └── findings.py          GET /api/datasets/{id}/findings
│   ├── analytics/
│   │   ├── profiling.py
│   │   ├── quality.py
│   │   ├── feature_engineering.py
│   │   ├── correlation.py
│   │   └── trends.py
│   ├── anomaly/
│   │   └── detector.py          Isolation Forest + evidence generation
│   ├── findings/
│   │   └── engine.py            deterministic findings from evidence
│   ├── models/                  Pydantic request/response schemas
│   ├── services/
│   │   └── dataset_manager.py   in-memory store + column-role inference
│   └── utils/
│       └── validation.py        upload validation (extension/size/shape)
├── tests/                       pytest suite (20 tests)
├── data/sample/transactions_sample.csv
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Setup

### 1. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. (Optional) copy environment template

```bash
cp .env.example .env
```

Phase 1 doesn't require any secrets — datasets live in memory for the
lifetime of the server process — so this file is mostly a placeholder for
future phases (e.g. an `ANTHROPIC_API_KEY` when the LLM layer is added).

### 4. Run the server

```bash
uvicorn app.main:app --reload
```

The API is served at `http://127.0.0.1:8000`. Interactive OpenAPI docs are at
`http://127.0.0.1:8000/docs` (Swagger UI) and `/redoc`.

### 5. Run tests

```bash
pytest
```

All 20 tests run fully offline against an in-process FastAPI `TestClient` —
no network access or external services required.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness check |
| POST | `/api/datasets/upload` | Upload a CSV/XLSX transaction dataset |
| GET | `/api/datasets/{dataset_id}/profile` | Column-level profile (dtypes, roles, stats) |
| GET | `/api/datasets/{dataset_id}/quality` | Data-quality report |
| GET | `/api/datasets/{dataset_id}/anomalies` | Isolation Forest anomaly results |
| GET | `/api/datasets/{dataset_id}/correlations` | Pairwise numeric correlations |
| GET | `/api/datasets/{dataset_id}/trends` | Time-based trend analysis |
| GET | `/api/datasets/{dataset_id}/findings` | Combined structured findings |
| POST | `/api/datasets/{dataset_id}/analyze` | Runs everything above and returns it in one payload |

### Quick manual test with the sample dataset

```bash
curl -X POST http://127.0.0.1:8000/api/datasets/upload \
  -F "file=@data/sample/transactions_sample.csv"
# → copy the returned "dataset_id"

curl http://127.0.0.1:8000/api/datasets/<dataset_id>/anomalies
curl -X POST http://127.0.0.1:8000/api/datasets/<dataset_id>/analyze
```

## UCI Online Retail Dataset

The system is built and tested against the schema-agnostic assumptions
needed to work with the [UCI Online Retail dataset](https://archive.ics.uci.edu/dataset/352/online%2Bretail)
(InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice,
CustomerID, Country), without hard-coding those column names:

- `Quantity`/`UnitPrice`-style columns are detected by name keywords and
  `amount = Quantity * UnitPrice` is derived automatically when no explicit
  amount/total column already exists.
- `InvoiceNo`/`CustomerID`-style columns are detected as identifiers and
  excluded from ML features (they carry no statistical signal and would leak
  row identity into the model).
- `InvoiceDate` is detected as a datetime column even if it arrives as text,
  and used both for date-based feature engineering and trend analysis.

Because the real UCI file is large (~540k rows) and not needed to validate
the backend's logic, a small synthetic dataset with the same *shape* of
problem is included at `data/sample/transactions_sample.csv` for local
testing (see below). To use the real UCI Online Retail file, download the
`.xlsx` from the link above and upload it directly through
`POST /api/datasets/upload` — no code changes are required.

## Anomaly Detection Methodology

**Algorithm:** [Isolation Forest](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)
(`sklearn.ensemble.IsolationForest`), chosen because it doesn't require
labeled data, scales well, and handles the mixed, unknown-schema numeric
feature sets this system has to work with.

**Features used:** all detected numeric columns (excluding identifiers) plus
engineered date features (`year`, `month`, `day`, `day-of-week`, and `hour`
only if timestamps carry real time-of-day information — e.g. not all
midnight). Constant (zero-variance) engineered columns are dropped to avoid
polluting the model, and remaining missing values are median-imputed so a
few missing cells don't remove otherwise-informative rows.

**Scaling:** features are standardized (`StandardScaler`) before fitting,
since Isolation Forest's random splits are sensitive to feature scale.

**Contamination strategy (documented):** `contamination="auto"`. This uses
Isolation Forest's own score-offset convention (based on the original paper)
rather than an arbitrary fixed fraction like "assume 5% of rows are
anomalies" — which would be a guess for a dataset of unknown composition.
`random_state=42` is fixed so results are reproducible across runs on the
same data.

**Severity:** anomalies are bucketed into `low` / `medium` / `high` using the
percentile of their anomaly score relative to the rest of the dataset (worst
2% → `high`, worst 10% → `medium`, everything else flagged → `low`).

**Evidence per anomaly:** row index, transaction ID (when an identifier
column is available), original row values, anomaly score, severity, and a
statistical evidence block (percentile, median, mean, IQR, and deviation from
median for the single most-deviating feature, plus every engineered feature's
raw value) so a human — or a future LLM layer — can see *why* a row was
flagged.

**Handled edge cases:** datasets with fewer than 10 rows, datasets with no
usable numeric/engineered features, and datasets where every candidate
feature is constant all return `available: false` with a clear message
instead of crashing or fabricating a result.

### Anomaly ≠ Fraud

Every anomaly response includes a disclaimer, and results are consistently
described using wording like **"potential anomaly"**, **"unusual
transaction"**, and **"investigation candidate."** A statistical outlier is
not proof of fraud or wrongdoing — it's a signal that a human (or the future
LLM investigation layer) should look closer. The same discipline is applied
to correlations, which are reported with coefficient and strength only and
are explicitly never described as causal.

## Limitations

- **No database / no persistence.** Uploaded datasets live in an in-memory
  Python dict for the lifetime of the server process. Restarting the server
  clears all uploaded datasets — by design for Phase 1.
- **Single-process, single-machine.** There's no distributed storage or
  multi-worker dataset sharing; running with multiple Uvicorn workers would
  each have their own separate in-memory store.
- **Heuristic column-role inference.** Column roles (identifier vs.
  numerical vs. quantity vs. amount, etc.) are inferred from column names and
  data shape using generic keyword/statistical heuristics. This works well
  for typical transaction datasets (including UCI Online Retail) but is not
  guaranteed to be correct for arbitrary, unusually-named schemas.
- **Isolation Forest's `contamination="auto"`** can flag a non-trivial
  fraction of rows as anomalies on datasets with many derived/discrete
  features (e.g. calendar features) even when true outliers are rare; the
  `severity` bucketing and evidence fields are intended to help a human (or
  the future LLM layer) triage the most significant candidates first rather
  than treating every flagged row as equally suspicious.
- **Correlation is Pearson only** (linear relationships); non-linear
  relationships between columns are not captured.
- **Trend analysis requires one usable datetime column and one amount
  column**; datasets lacking either return a clear "unavailable" response
  rather than a trend.

## Future Integration (out of scope for Phase 1)

- **Next.js frontend:** will call this API's endpoints directly (CORS is
  already configured permissively for local development in `app/main.py` —
  tighten `allow_origins` before production deployment) to upload datasets
  and render profiles, quality reports, anomaly tables, correlation
  matrices, and trend charts.
- **LLM layer:** a future service will take the `findings` (and/or full
  `analyze`) JSON payload and use it as grounded context for a conversational
  "investigate this anomaly" experience — asking the LLM to explain,
  compare, or drill into findings the backend has already computed and
  verified. This backend intentionally does no LLM calls, RAG, or agentic
  reasoning; it only produces the structured, deterministic evidence that
  layer will consume.
