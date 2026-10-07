"""Time-based trend analysis: daily/monthly aggregation and notable changes.

Falls back cleanly to an "unavailable" response when no usable datetime
column or amount signal exists, rather than crashing.
"""
from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from app.models.analytics import NotableChange, TrendPoint, TrendResponse
from app.services.dataset_manager import StoredDataset

MIN_PERIODS_FOR_TREND = 3
Z_SCORE_NOTABLE_THRESHOLD = 2.0


def _pick_datetime_column(stored: StoredDataset) -> Optional[str]:
    return stored.roles.datetime_columns[0] if stored.roles.datetime_columns else None


def analyze_trends(stored: StoredDataset) -> TrendResponse:
    df = stored.dataframe
    dt_col = _pick_datetime_column(stored)

    if dt_col is None:
        return TrendResponse(
            dataset_id=stored.dataset_id,
            available=False,
            message="No suitable datetime column was detected; trend analysis is unavailable.",
        )

    amount_col = stored.roles.amount_column
    if amount_col is None:
        return TrendResponse(
            dataset_id=stored.dataset_id,
            available=False,
            datetime_column=dt_col,
            message=(
                "No transaction amount column (or Quantity x UnitPrice derivation) is "
                "available; trend analysis is unavailable."
            ),
        )

    working = df[[dt_col, amount_col]].copy()
    working[dt_col] = pd.to_datetime(working[dt_col], errors="coerce", format="mixed")
    working = working.dropna(subset=[dt_col])
    working = working.sort_values(dt_col)

    if working.empty:
        return TrendResponse(
            dataset_id=stored.dataset_id,
            available=False,
            datetime_column=dt_col,
            amount_column=amount_col,
            message="Datetime column contains no parseable timestamps; trend analysis is unavailable.",
        )

    span_days = (working[dt_col].max() - working[dt_col].min()).days
    granularity = "daily" if span_days <= 120 else "monthly"
    freq = "D" if granularity == "daily" else "MS"

    grouped = working.set_index(dt_col).resample(freq)[amount_col].agg(["count", "sum", "mean"])
    grouped = grouped[grouped["count"] > 0]

    if len(grouped) < MIN_PERIODS_FOR_TREND:
        return TrendResponse(
            dataset_id=stored.dataset_id,
            available=False,
            datetime_column=dt_col,
            amount_column=amount_col,
            message=(
                f"Only {len(grouped)} time period(s) with data are available; at least "
                f"{MIN_PERIODS_FOR_TREND} are needed for trend analysis."
            ),
        )

    points = [
        TrendPoint(
            period=str(idx.date()) if granularity == "daily" else idx.strftime("%Y-%m"),
            transaction_count=int(row["count"]),
            total_amount=round(float(row["sum"]), 2),
            average_amount=round(float(row["mean"]), 2),
        )
        for idx, row in grouped.iterrows()
    ]

    notable_changes = _find_notable_changes(grouped, granularity)

    return TrendResponse(
        dataset_id=stored.dataset_id,
        available=True,
        datetime_column=dt_col,
        amount_column=amount_col,
        granularity=granularity,
        points=points,
        notable_changes=notable_changes,
    )


def _find_notable_changes(grouped: pd.DataFrame, granularity: str) -> list[NotableChange]:
    notable = []
    for metric in ("sum", "count"):
        series = grouped[metric].astype(float)
        mean = series.mean()
        std = series.std(ddof=0)
        if not std or np.isnan(std) or std == 0:
            continue
        z_scores = (series - mean) / std
        for idx, z in z_scores.items():
            if abs(z) >= Z_SCORE_NOTABLE_THRESHOLD:
                period = str(idx.date()) if granularity == "daily" else idx.strftime("%Y-%m")
                direction = "spike" if z > 0 else "drop"
                metric_label = "total amount" if metric == "sum" else "transaction count"
                notable.append(
                    NotableChange(
                        period=period,
                        metric=metric_label,
                        change_description=f"Statistically notable {direction} in {metric_label} (z={round(float(z), 2)}).",
                        z_score=round(float(z), 2),
                    )
                )
    return notable
