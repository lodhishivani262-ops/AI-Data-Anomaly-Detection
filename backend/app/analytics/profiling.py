"""Dataset profiling: shapes, dtypes, roles, uniqueness, missingness, stats."""
from __future__ import annotations

import math
from typing import Any, Dict

import pandas as pd

from app.models.analytics import ColumnProfile, ProfileResponse
from app.services.dataset_manager import StoredDataset


def _safe_float(value: Any) -> Any:
    """Convert numpy/pandas scalars to JSON-safe Python floats."""
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _role_for_column(col: str, stored: StoredDataset) -> str:
    roles = stored.roles
    if col in roles.identifier_columns:
        return "identifier"
    if col in roles.datetime_columns:
        return "datetime"
    if col in roles.numerical_columns:
        return "numerical"
    if col in roles.categorical_columns:
        return "categorical"
    return "unknown"


def _column_stats(series: pd.Series, role: str) -> Dict[str, Any]:
    stats: Dict[str, Any] = {}
    if role == "numerical":
        described = series.describe()
        for key in ("mean", "std", "min", "25%", "50%", "75%", "max"):
            if key in described.index:
                stats[key.replace("%", "pct")] = _safe_float(described[key])
    elif role == "categorical":
        value_counts = series.value_counts(dropna=True).head(5)
        stats["top_values"] = {str(k): int(v) for k, v in value_counts.items()}
    elif role == "datetime":
        parsed = pd.to_datetime(series, errors="coerce", format="mixed")
        if parsed.notna().any():
            stats["min"] = str(parsed.min())
            stats["max"] = str(parsed.max())
    return stats


def profile_dataset(stored: StoredDataset) -> ProfileResponse:
    df = stored.dataframe
    column_profiles = []

    for col in df.columns:
        series = df[col]
        role = _role_for_column(col, stored)
        missing_count = int(series.isna().sum())
        total = len(series)
        missing_pct = round((missing_count / total) * 100, 2) if total else 0.0

        column_profiles.append(
            ColumnProfile(
                name=col,
                dtype=str(series.dtype),
                role=role,
                unique_count=int(series.nunique(dropna=True)),
                missing_count=missing_count,
                missing_percentage=missing_pct,
                stats=_column_stats(series, role),
            )
        )

    return ProfileResponse(
        dataset_id=stored.dataset_id,
        rows=len(df),
        columns=len(df.columns),
        column_names=list(df.columns),
        numerical_columns=stored.roles.numerical_columns,
        categorical_columns=stored.roles.categorical_columns,
        datetime_columns=stored.roles.datetime_columns,
        identifier_columns=stored.roles.identifier_columns,
        column_profiles=column_profiles,
    )
