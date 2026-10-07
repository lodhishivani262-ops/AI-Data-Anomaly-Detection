# AI Data Anomaly Detection & Investigation Copilot

[![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.13-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/ML-Isolation%20Forest-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Pytest-22%2F22%20Passing%20(100%25)-brightgreen.svg)](https://docs.pytest.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An end-to-end full-stack platform that ingests structured transaction data (CSV/XLSX), profiles data quality, statistically detects unusual records using unsupervised Machine Learning (**Isolation Forest**), and explains findings through an evidence-grounded **AI Investigation Copilot** powered by Google Gemini.

---

## 🌟 Key Features

1. **Schema-Agnostic Ingestion**: Upload any business or transaction dataset in `.csv` or `.xlsx` format (up to 25 MB). Semantic column roles (`amount`, `quantity`, `unit_price`, `timestamp`, `category`, `identifier`) are inferred automatically via keyword heuristics.
2. **Contextual Anomaly Detection ($z_{\text{category}}$)**:
   - Uses **Isolation Forest** (200 estimators, `contamination="auto"`) combined with subgroup median normalization.
   - Detects contextual outliers: flags charges that deviate sharply from their *specific product category peer group* (e.g., \$500 for stationery vs. \$500 for electronics).
3. **High-Performance In-Memory Caching**:
   - Fitted anomaly scores and records are cached in memory within `StoredDataset`.
   - Repeated page visits, tab switches, and AI Copilot queries return in `< 1ms` without retraining the 200 decision trees.
4. **Data Quality & Profiling Suite**:
   - Automated detection of missingness, duplicate rows, constant columns, and invalid values.
   - Pearson correlation matrices and temporal trend decomposition.
5. **Grounded AI Investigation Copilot**:
   - Conversational assistant powered by Google Gemini with multi-model failover (`gemini-3.5-flash-lite` $\to$ `gemini-3.1-flash-lite` $\to$ `gemini-flash-latest`).
   - Grounded strictly in pre-computed statistical evidence (IQR spread, median deviations) to eliminate LLM hallucinations.
6. **Modern Responsive UI**:
   - Built on **Next.js 16 (App Router)** and **React 19** with **Tailwind CSS v4**.
   - Interactive Recharts data visualizations with smooth dark/light mode toggle.
7. **Production Ready & Containerized**:
   - Single-command orchestration with **Docker Compose**.
   - 100% automated test coverage across 22 Pytest unit and integration test cases.

---

## 🏗️ Architecture & Data Flow

```
[ User Browser ]
       │
       ▼  (Next.js 16 / React 19 Frontend : Port 3000)
┌────────────────────────────────────────────────────────────────────────┐
│  Upload View ──> Dashboard KPIs ──> Anomalies Table ──> Trends Chart   │
│                                                     ──> AI Copilot     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  HTTP REST (FastAPI : Port 8000)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  FastAPI Backend                                                       │
│                                                                        │
│  1. File Validation (Max 25 MB, CSV/XLSX, > 10 rows)                   │
│  2. Column Role Inference (amount, timestamp, category, ID)            │
│  3. Feature Engineering:                                               │
│     • Numerical imputation & StandardScaler                            │
│     • Temporal calendar features (month, day, dayofweek, hour)         │
│     • Category Normalization (z_category & ratio to category median)   │
│  4. Isolation Forest ML Engine (200 Trees, Contamination='auto')        │
│  5. Statistical Evidence Extraction (Median, IQR, Percentiles)         │
│  6. In-Memory Result Cache (Sub-millisecond repeat queries)            │
│  7. AI Copilot Layer (Grounded Gemini prompt with failover)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
AI-Data-Anomaly-Detection/
├── backend/
│   ├── app/
│   │   ├── analytics/           # Profiling, data quality, correlation, trends, features
│   │   ├── anomaly/             # Isolation Forest detector & statistical evidence generator
│   │   ├── api/                 # FastAPI routers (datasets, analysis, findings, investigation)
│   │   ├── findings/            # Multi-dimensional findings engine
│   │   ├── models/              # Pydantic v2 schemas and data contracts
│   │   ├── services/            # In-memory DatasetManager, evidence selector, Gemini LLM client
│   │   └── utils/               # File validation and shape constraints
│   ├── tests/                   # Pytest automated test suite (22 tests)
│   ├── Dockerfile               # Python 3.12-slim production container
│   ├── requirements.txt         # Backend Python dependencies
│   └── .env.example             # Backend environment template
├── frontend/
│   ├── app/                     # Next.js 16 App Router pages
│   ├── components/              # UI components, Recharts visualizations, copilot modal
│   ├── lib/                     # API client, Dataset context, React 19 theme provider
│   ├── Dockerfile               # Node 20-alpine multi-stage production container
│   └── package.json             # NPM dependencies (React 19, Tailwind v4, Recharts)
├── docs/
│   └── PROJECT_ARCHITECTURE_AND_VIVA_GUIDE.md # 23-part comprehensive viva guide
├── docker-compose.yml           # One-command full-stack container orchestration
├── .env.example                 # Root environment variables template
├── .gitignore                   # Comprehensive Git protection rules
└── LICENSE                      # MIT Open Source License
```

---

## 🚀 Getting Started

### Option 1: Run with Docker Compose (Recommended)

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running, then execute:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/AI-Data-Anomaly-Detection.git
cd AI-Data-Anomaly-Detection

# 2. Configure environment variables (optional for AI Copilot)
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY from Google AI Studio

# 3. Start both Frontend and Backend
docker-compose up --build
```

* **Frontend**: [http://localhost:3000](http://localhost:3000)
* **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option 2: Run Locally (Without Docker)

#### Prerequisites
* Python 3.11+ (Python 3.12 or 3.13 recommended)
* Node.js 18+ (Node 20 recommended)

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv .venv
# On Windows:
..\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set up environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
In a **new terminal tab**:
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Automated Tests

The backend test suite includes 22 automated tests covering data parsing, column inference, Isolation Forest outlier detection, caching, category normalization, and edge cases.

```bash
cd backend
pytest -v
```

**Result**: `22 passed in 3.98s (100% pass rate)`.

---

## 📊 Recommended Datasets for Testing

You can test the platform with standard open benchmark datasets:
* **UCI Online Retail**: Transactions with `Quantity` and `UnitPrice` (automatically computes `amount`).
* **Kaggle Superstore Sales**: Orders with `Sales`, `Quantity`, `Discount`, and product `Category`.
* **Brazilian E-Commerce (Olist)**: `olist_order_payments_dataset.csv` or `olist_order_items_dataset.csv`.

*Guidelines: File must be `.csv` or `.xlsx`, under 25 MB, and have at least 10 rows.*

---

## 📚 Viva Voce & Academic Documentation

A complete, 23-part architectural audit, mathematical breakdown of Isolation Forest, and viva examination defense guide is included in:
👉 [`docs/PROJECT_ARCHITECTURE_AND_VIVA_GUIDE.md`](./docs/PROJECT_ARCHITECTURE_AND_VIVA_GUIDE.md)

---

## 📄 License

This project is open-source software licensed under the [MIT License](./LICENSE).
