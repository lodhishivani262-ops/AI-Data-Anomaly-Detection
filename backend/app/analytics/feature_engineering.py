"""Feature engineering for anomaly detection.

Builds a numeric feature matrix from a dataset without assuming a fixed
schema: uses whatever numerical columns exist, derives date-based features
from any detected datetime column, and always preserves original row index
and (when available) a transaction/identifier column for traceability.
Identifier columns themselves are never used as ML features (they carry no
statistical signal and would leak row identity into the model).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional

import numpy as np
import pandas as pd

from app.services.dataset_manager import StoredDataset


@dataclass
class FeatureSet:
    features: pd.DataFrame  # numeric, imputed, aligned to `row_index`
    row_index: List[int]
    transaction_id_column: Optional[str]
    feature_columns: List[str]


def _pick_transaction_id_column(stored: StoredDataset) -> Optional[str]:
    if stored.roles.identifier_columns:
        # Prefer a column whose name suggests it identifies a transaction/invoice
        # over a generic id (e.g. customer id), falling back to the first identifier.
        for col in stored.roles.identifier_columns:
            lowered = col.lower()
            if "invoice" in lowered or "transaction" in lowered or "order" in lowered:
                return col
        return stored.roles.identifier_columns[0]
    return None


def _datetime_features(df: pd.DataFrame, datetime_col: str) -> pd.DataFrame:
    parsed = pd.to_datetime(df[datetime_col], errors="coerce", format="mixed")
    out = pd.DataFrame(index=df.index)
    out["dt_year"] = parsed.dt.year
    out["dt_month"] = parsed.dt.month
    out["dt_day"] = parsed.dt.day
    out["dt_dayofweek"] = parsed.dt.dayofweek

    # Only add an hour feature if the timestamps carry meaningful time-of-day
    # information (i.e. not all midnight / not all identical / not all NaT).
    non_null_times = parsed.dropna()
    if not non_null_times.empty:
        has_time_component = (
            (non_null_times.dt.hour != 0).any()
            or (non_null_times.dt.minute != 0).any()
            or (non_null_times.dt.second != 0).any()
        )
        if has_time_component:
            out["dt_hour"] = parsed.dt.hour

    return out


def _category_normalized_features(df: pd.DataFrame, roles: ColumnRoles) -> pd.DataFrame:
    """Generate normalized features relative to categorical subgroup medians.

    For example, an order amount of $500 is normal for Electronics but highly
    anomalous for Office Supplies. Evaluating amounts relative to category
    medians (z_category) surfaces contextual, multi-dimensional anomalies.
    """
    out = pd.DataFrame(index=df.index)

    # 1. Target numeric column: prefer amount_column, then first non-identifier numeric column
    target_num = roles.amount_column
    if not target_num:
        for candidate in roles.unit_price_columns + roles.numerical_columns:
            if candidate not in roles.identifier_columns and candidate in df.columns:
                target_num = candidate
                break

    if not target_num or target_num not in df.columns:
        return out

    num_series = pd.to_numeric(df[target_num], errors="coerce")
    if num_series.dropna().empty:
        return out

    # 2. Candidate grouping column: look in categorical_columns
    group_col = None
    # First pass: look specifically for category/dept/group
    for col in roles.categorical_columns:
        if col in roles.identifier_columns or col not in df.columns:
            continue
        n_unique = df[col].nunique(dropna=True)
        if 2 <= n_unique <= 100:
            lowered = col.lower()
            if any(k in lowered for k in ("category", "cat", "dept", "department", "group", "type", "class")):
                group_col = col
                break

    # Second pass: if no category-named column, look for product/item or any valid low-cardinality column
    if not group_col:
        for col in roles.categorical_columns:
            if col in roles.identifier_columns or col not in df.columns:
                continue
            n_unique = df[col].nunique(dropna=True)
            if 2 <= n_unique <= 100:
                group_col = col
                break

    if not group_col:
        return out

    try:
        grouped = num_series.groupby(df[group_col])
        group_median = grouped.transform("median")
        group_std = grouped.transform("std").fillna(0.0)

        # Standardized z-score relative to category median & spread
        safe_std = group_std.replace(0.0, 1.0)
        z_col_name = f"z_cat_{group_col}_{target_num}"
        out[z_col_name] = ((num_series - group_median) / safe_std).fillna(0.0)

        # Ratio to category median (clipped to avoid infinite blowup)
        safe_median = group_median.abs().replace(0.0, 1.0)
        ratio_col_name = f"ratio_to_cat_median_{target_num}"
        out[ratio_col_name] = (num_series / safe_median).clip(lower=0.0, upper=100.0).fillna(1.0)
    except Exception:
        return pd.DataFrame(index=df.index)

    return out


def build_feature_set(stored: StoredDataset) -> FeatureSet:
    df = stored.dataframe
    roles = stored.roles

    numeric_cols = [c for c in roles.numerical_columns if c not in roles.identifier_columns]

    feature_frames = []
    if numeric_cols:
        feature_frames.append(df[numeric_cols].copy())

    for dt_col in roles.datetime_columns:
        feature_frames.append(_datetime_features(df, dt_col))

    cat_norm_df = _category_normalized_features(df, roles)
    if not cat_norm_df.empty:
        feature_frames.append(cat_norm_df)

    if not feature_frames:
        return FeatureSet(
            features=pd.DataFrame(index=df.index),
            row_index=list(df.index),
            transaction_id_column=_pick_transaction_id_column(stored),
            feature_columns=[],
        )

    combined = pd.concat(feature_frames, axis=1)

    # Avoid leakage: drop any feature column that is constant (zero variance)
    # since it can't inform an anomaly score and, in edge cases, constant
    # engineered columns can destabilise scaling.
    non_constant_cols = [c for c in combined.columns if combined[c].nunique(dropna=True) > 1]
    combined = combined[non_constant_cols]

    # Impute missing values with the column median so a few missing cells
    # don't drop otherwise-informative rows from anomaly detection.
    for col in combined.columns:
        if combined[col].isna().any():
            median = combined[col].median()
            combined[col] = combined[col].fillna(median if not np.isnan(median) else 0)

    return FeatureSet(
        features=combined,
        row_index=list(df.index),
        transaction_id_column=_pick_transaction_id_column(stored),
        feature_columns=list(combined.columns),
    )
