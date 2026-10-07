"""Pairwise correlation analysis between numerical columns.

Reports coefficient/strength only -- never claims or implies causation.
"""
from __future__ import annotations

import math
from itertools import combinations
from typing import List

from app.models.analytics import CorrelationPair, CorrelationResponse
from app.services.dataset_manager import StoredDataset

MIN_COLUMNS_FOR_CORRELATION = 2
MIN_ROWS_FOR_CORRELATION = 5


def _strength_label(coef: float) -> str:
    abs_coef = abs(coef)
    if abs_coef >= 0.7:
        return "strong"
    if abs_coef >= 0.4:
        return "moderate"
    if abs_coef >= 0.2:
        return "weak"
    return "negligible"


def compute_correlations(stored: StoredDataset) -> CorrelationResponse:
    df = stored.dataframe
    numeric_cols = [
        c for c in stored.roles.numerical_columns if c not in stored.roles.identifier_columns
    ]
    # Drop constant columns -- correlation is undefined for them.
    usable_cols = [c for c in numeric_cols if df[c].nunique(dropna=True) > 1]

    if len(usable_cols) < MIN_COLUMNS_FOR_CORRELATION or len(df) < MIN_ROWS_FOR_CORRELATION:
        return CorrelationResponse(
            dataset_id=stored.dataset_id,
            method="pearson",
            columns_considered=usable_cols,
            pairs=[],
            note=(
                "Not enough suitable numerical columns or rows to compute meaningful "
                "correlations."
            ),
        )

    corr_matrix = df[usable_cols].corr(method="pearson")

    pairs: List[CorrelationPair] = []
    for col_a, col_b in combinations(usable_cols, 2):
        coef = corr_matrix.loc[col_a, col_b]
        if coef is None or (isinstance(coef, float) and math.isnan(coef)):
            continue
        pairs.append(
            CorrelationPair(
                column_a=col_a,
                column_b=col_b,
                coefficient=round(float(coef), 4),
                method="pearson",
                strength=_strength_label(float(coef)),
            )
        )

    pairs.sort(key=lambda p: abs(p.coefficient), reverse=True)

    return CorrelationResponse(
        dataset_id=stored.dataset_id,
        method="pearson",
        columns_considered=usable_cols,
        pairs=pairs,
        note="Correlation does not imply causation.",
    )
