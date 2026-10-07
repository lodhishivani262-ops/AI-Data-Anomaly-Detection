"""Shared pytest fixtures for the FastAPI test client and sample data."""
from __future__ import annotations

import io

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def _synthetic_dataframe(n_rows: int = 200, with_anomalies: bool = True) -> pd.DataFrame:
    import numpy as np

    rng = np.random.default_rng(42)
    dates = pd.date_range("2025-01-01", periods=n_rows, freq="h")
    quantity = rng.integers(1, 10, size=n_rows)
    unit_price = rng.uniform(2, 20, size=n_rows).round(2)

    if with_anomalies:
        # Inject a handful of clearly unusual rows.
        quantity[:5] = [500, 600, 700, 800, 900]
        unit_price[:5] = [999.0, 850.0, 720.0, 640.0, 610.0]

    df = pd.DataFrame(
        {
            "transaction_id": [f"INV{1000 + i}" for i in range(n_rows)],
            "timestamp": dates.strftime("%Y-%m-%d %H:%M:%S"),
            "customer_id": [f"CUST{100 + (i % 20)}" for i in range(n_rows)],
            "product": rng.choice(["Mug", "Lamp", "Scarf", "Speaker"], size=n_rows),
            "category": rng.choice(["Home", "Electronics", "Apparel"], size=n_rows),
            "quantity": quantity,
            "unit_price": unit_price,
            "country": rng.choice(["UK", "Germany", "France"], size=n_rows),
        }
    )
    return df


@pytest.fixture()
def sample_csv_bytes() -> bytes:
    df = _synthetic_dataframe()
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


@pytest.fixture()
def small_csv_bytes() -> bytes:
    """A dataset too small for anomaly detection (below the row threshold)."""
    df = _synthetic_dataframe(n_rows=5, with_anomalies=False)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


@pytest.fixture()
def no_datetime_csv_bytes() -> bytes:
    df = _synthetic_dataframe(n_rows=50)
    df = df.drop(columns=["timestamp"])
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


@pytest.fixture()
def sample_xlsx_bytes() -> bytes:
    df = _synthetic_dataframe(n_rows=60)
    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    return buf.getvalue()


@pytest.fixture()
def missing_values_csv_bytes() -> bytes:
    df = _synthetic_dataframe(n_rows=100)
    df.loc[0:29, "unit_price"] = None  # 30% missing
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")


@pytest.fixture()
def duplicates_csv_bytes() -> bytes:
    df = _synthetic_dataframe(n_rows=50)
    df = pd.concat([df, df.iloc[:10]], ignore_index=True)  # 10 duplicate rows
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")
