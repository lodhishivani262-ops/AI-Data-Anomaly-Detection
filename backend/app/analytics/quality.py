"""Data-quality checks: missingness, duplicates, constant/high-cardinality
columns, suspicious dtypes, and detectable invalid values.

No arbitrary overall "quality score" is invented, per project requirements --
each dimension is reported with its own concrete evidence.
"""
from __future__ import annotations

from typing import List

import pandas as pd

from app.models.analytics import (
    ConstantColumnInfo,
    DuplicateInfo,
    HighCardinalityInfo,
    InvalidValueInfo,
    MissingValueInfo,
    QualityResponse,
    SuspiciousTypeInfo,
)
from app.services.dataset_manager import StoredDataset

HIGH_CARDINALITY_RATIO_THRESHOLD = 0.9
HIGH_CARDINALITY_MIN_UNIQUE = 50


def assess_quality(stored: StoredDataset) -> QualityResponse:
    df = stored.dataframe
    total_rows = len(df)
    total_columns = len(df.columns)

    missing_values = _missing_values(df)
    duplicates = _duplicates(df)
    constant_columns = _constant_columns(df)
    high_cardinality = _high_cardinality(df, stored)
    suspicious_types = _suspicious_types(df, stored)
    invalid_values = _invalid_values(df, stored)

    return QualityResponse(
        dataset_id=stored.dataset_id,
        total_rows=total_rows,
        total_columns=total_columns,
        missing_values=missing_values,
        duplicates=duplicates,
        constant_columns=constant_columns,
        high_cardinality_columns=high_cardinality,
        suspicious_types=suspicious_types,
        invalid_values=invalid_values,
    )


def _missing_values(df: pd.DataFrame) -> List[MissingValueInfo]:
    result = []
    total = len(df)
    for col in df.columns:
        missing = int(df[col].isna().sum())
        if missing > 0:
            pct = round((missing / total) * 100, 2) if total else 0.0
            result.append(MissingValueInfo(column=col, missing_count=missing, missing_percentage=pct))
    return result


def _duplicates(df: pd.DataFrame) -> DuplicateInfo:
    dup_mask = df.duplicated(keep="first")
    dup_count = int(dup_mask.sum())
    total = len(df)
    pct = round((dup_count / total) * 100, 2) if total else 0.0
    sample_indices = df.index[dup_mask].tolist()[:10]
    return DuplicateInfo(
        duplicate_row_count=dup_count,
        duplicate_percentage=pct,
        sample_row_indices=[int(i) for i in sample_indices],
    )


def _constant_columns(df: pd.DataFrame) -> List[ConstantColumnInfo]:
    result = []
    for col in df.columns:
        non_null = df[col].dropna()
        if len(non_null) > 0 and non_null.nunique() == 1:
            value = non_null.iloc[0]
            result.append(ConstantColumnInfo(column=col, constant_value=_jsonable(value)))
    return result


def _high_cardinality(df: pd.DataFrame, stored: StoredDataset) -> List[HighCardinalityInfo]:
    result = []
    total = len(df)
    if total == 0:
        return result
    for col in stored.roles.categorical_columns:
        unique_count = int(df[col].nunique(dropna=True))
        ratio = unique_count / total
        if ratio >= HIGH_CARDINALITY_RATIO_THRESHOLD and unique_count >= HIGH_CARDINALITY_MIN_UNIQUE:
            result.append(
                HighCardinalityInfo(column=col, unique_count=unique_count, unique_ratio=round(ratio, 3))
            )
    return result


def _suspicious_types(df: pd.DataFrame, stored: StoredDataset) -> List[SuspiciousTypeInfo]:
    """Flag categorical/object columns that are actually mostly numeric-looking,
    or numeric columns stored as text -- a common real-world data-quality issue.
    """
    result = []
    for col in stored.roles.categorical_columns:
        series = df[col].dropna().astype(str)
        if series.empty:
            continue
        numeric_like = pd.to_numeric(series, errors="coerce").notna().mean()
        if numeric_like >= 0.9:
            result.append(
                SuspiciousTypeInfo(
                    column=col,
                    declared_dtype=str(df[col].dtype),
                    issue="Column is categorical/text but over 90% of values look numeric.",
                )
            )
    return result


def _invalid_values(df: pd.DataFrame, stored: StoredDataset) -> List[InvalidValueInfo]:
    result = []

    # Negative values in quantity/amount columns are detectable, common
    # data-entry issues for transaction data (though not always an error --
    # e.g. UCI Online Retail uses negative Quantity for returns/cancellations).
    for col in stored.roles.numerical_columns:
        series = df[col]
        negative_mask = series < 0
        negative_count = int(negative_mask.sum())
        if negative_count > 0:
            result.append(
                InvalidValueInfo(
                    column=col,
                    issue="Negative numeric values detected (may indicate returns/cancellations or data-entry errors).",
                    invalid_count=negative_count,
                    sample_row_indices=[int(i) for i in df.index[negative_mask].tolist()[:10]],
                )
            )

    # Unparseable datetime values in columns detected as datetime-like.
    for col in stored.roles.datetime_columns:
        series = df[col]
        if pd.api.types.is_datetime64_any_dtype(series):
            invalid_mask = series.isna()
        else:
            parsed = pd.to_datetime(series, errors="coerce", format="mixed")
            invalid_mask = parsed.isna() & series.notna()
        invalid_count = int(invalid_mask.sum())
        if invalid_count > 0:
            result.append(
                InvalidValueInfo(
                    column=col,
                    issue="Values could not be parsed as valid dates/times.",
                    invalid_count=invalid_count,
                    sample_row_indices=[int(i) for i in df.index[invalid_mask].tolist()[:10]],
                )
            )

    return result


def _jsonable(value):
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value
