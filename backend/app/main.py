"""FastAPI application entrypoint for the AI Data Anomaly Detection &
Investigation Copilot."""
from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

# In development, optionally load local .env files from backend/ or project root.
# In production, environment variables are provided directly by Docker / the runtime environment.
backend_env = Path(__file__).resolve().parent.parent / ".env"
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
if backend_env.is_file():
    load_dotenv(backend_env)
elif root_env.is_file():
    load_dotenv(root_env)
else:
    load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analysis, datasets, findings, investigation

app = FastAPI(
    title="AI Data Anomaly Detection & Investigation Copilot",
    description=(
        "Upload transaction datasets (CSV/XLSX), profile them, assess data quality, "
        "detect statistical anomalies with Isolation Forest, and investigate findings "
        "with an evidence-grounded AI layer."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router)
app.include_router(analysis.router)
app.include_router(findings.router)
app.include_router(investigation.router)


@app.get("/api/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "service": "ai-anomaly-detection-backend"}
