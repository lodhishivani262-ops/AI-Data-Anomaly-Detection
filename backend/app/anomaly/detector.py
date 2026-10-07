"""Isolation Forest based anomaly detection with rich, evidence-based output.

Contamination strategy (documented, deterministic):
    We use scikit-learn's ``contamination="auto"`` threshold, which sets the
    decision boundary using Isolation Forest's own offset convention rather
    than an arbitrarily chosen fraction. This avoids hard-coding "5% of rows
    are anomalies" for datasets of unknown composition. ``random_state=42``
    is fixed for reproducibility across runs.

Anomaly != fraud: outputs are consistently described as "potential anomaly"
/ "unusual transaction" / "investigation candidate".
"""
from __future__ import annotations

import math
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.analytics.feature_engineering import build_feature_set
from app.models.findings import AnomalyEvidence, AnomalyRecord, AnomalyResponse
from app.services.dataset_manager import StoredDataset

RANDOM_STATE = 42
MIN_ROWS_FOR_DETECTION = 10
MIN_FEATURES_FOR_DETECTION = 1
CONTAMINATION = "auto"


def _severity_for_score(score: float, scores: np.ndarray) -> str:
    """Map an anomaly score to a severity bucket using score percentiles.

    Lower (more negative) Isolation Forest scores are more anomalous.
    """
    p10 = np.percentile(scores, 10)
    p2 = np.percentile(scores, 2)
    if score <= p2:
        return "high"
    if score <= p10:
        return "medium"
    return "low"


def _safe_float(value: Any):
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def detect_anomalies(stored: StoredDataset, force_recompute: bool = False) -> AnomalyResponse:
    if not force_recompute and getattr(stored, "anomaly_response", None) is not None:
        return stored.anomaly_response  # type: ignore[return-value]

    df = stored.dataframe
    total_rows = len(df)

    feature_set = build_feature_set(stored)
    features = feature_set.features

    if total_rows < MIN_ROWS_FOR_DETECTION:
        resp = AnomalyResponse(
            dataset_id=stored.dataset_id,
            method="isolation_forest",
            available=False,
            total_rows=total_rows,
            anomaly_count=0,
            message=(
                f"Dataset has only {total_rows} rows; at least "
                f"{MIN_ROWS_FOR_DETECTION} are required for reliable anomaly detection."
            ),
        )
        stored.anomaly_response = resp
        return resp

    if features.shape[1] < MIN_FEATURES_FOR_DETECTION:
        resp = AnomalyResponse(
            dataset_id=stored.dataset_id,
            method="isolation_forest",
            available=False,
            total_rows=total_rows,
            anomaly_count=0,
            message=(
                "No suitable numerical or engineered features were found. "
                "Anomaly detection requires at least one usable numeric signal."
            ),
        )
        stored.anomaly_response = resp
        return resp

    # All-constant feature set (can happen if every numeric column has a
    # single value) was already filtered by feature engineering, but guard
    # again in case that leaves zero usable columns.
    if features.shape[1] == 0:
        resp = AnomalyResponse(
            dataset_id=stored.dataset_id,
            method="isolation_forest",
            available=False,
            total_rows=total_rows,
            anomaly_count=0,
            message="All candidate features were constant; anomaly detection is not meaningful.",
        )
        stored.anomaly_response = resp
        return resp

    scaler = StandardScaler()
    X = scaler.fit_transform(features.values)

    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
    )
    model.fit(X)
    predictions = model.predict(X)  # -1 = anomaly, 1 = normal
    scores = model.decision_function(X)  # lower = more anomalous

    anomaly_mask = predictions == -1
    anomaly_positions = np.where(anomaly_mask)[0]

    # Precompute per-feature descriptive stats (on the full, non-anomaly-
    # filtered feature set) so each anomaly's evidence is comparable against
    # the overall distribution.
    feature_stats = {
        col: {
            "median": features[col].median(),
            "mean": features[col].mean(),
            "q1": features[col].quantile(0.25),
            "q3": features[col].quantile(0.75),
        }
        for col in features.columns
    }

    id_col = feature_set.transaction_id_column

    records: List[AnomalyRecord] = []
    for pos in anomaly_positions:
        row_idx = int(feature_set.row_index[pos])
        row = df.loc[row_idx]
        score = float(scores[pos])
        severity = _severity_for_score(score, scores)
        percentile = float((scores <= score).mean() * 100)

        evidence = _build_evidence(features, pos, feature_stats, percentile)

        original_values = {
            col: _jsonable(row[col]) for col in df.columns if col != id_col
        }

        records.append(
            AnomalyRecord(
                row_index=row_idx,
                transaction_id=str(row[id_col]) if id_col else None,
                anomaly_score=round(score, 6),
                severity=severity,
                original_values=original_values,
                evidence=evidence,
            )
        )

    # Most anomalous first.
    records.sort(key=lambda r: r.anomaly_score)

    response = AnomalyResponse(
        dataset_id=stored.dataset_id,
        method="isolation_forest",
        available=True,
        total_rows=total_rows,
        anomaly_count=len(records),
        contamination=None,  # "auto" strategy: no fixed fraction to report
        features_used=feature_set.feature_columns,
        anomalies=records,
        message=None,
    )
    stored.anomaly_response = response
    return response


def _build_evidence(features: pd.DataFrame, pos: int, feature_stats: Dict[str, Dict[str, float]], percentile: float) -> AnomalyEvidence:
    # Use the single most-informative feature (largest |z-score| deviation)
    # to populate the headline median/mean/iqr/deviation figures, while the
    # full per-feature values are attached for transparency.
    row = features.iloc[pos]
    best_col = None
    best_z = -1.0
    for col in features.columns:
        stats = feature_stats[col]
        iqr = stats["q3"] - stats["q1"]
        spread = iqr if iqr > 0 else (features[col].std() or 1.0)
        z = abs(row[col] - stats["median"]) / spread if spread else 0.0
        if z > best_z:
            best_z = z
            best_col = col

    feature_values = {col: _safe_float(row[col]) or 0.0 for col in features.columns}

    if best_col is not None:
        stats = feature_stats[best_col]
        iqr = stats["q3"] - stats["q1"]
        deviation = row[best_col] - stats["median"]
        return AnomalyEvidence(
            percentile=round(percentile, 2),
            median=_safe_float(stats["median"]),
            mean=_safe_float(stats["mean"]),
            iqr=_safe_float(iqr),
            deviation_from_median=_safe_float(deviation),
            feature_values=feature_values,
        )

    return AnomalyEvidence(percentile=round(percentile, 2), feature_values=feature_values)


def _jsonable(value):
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        return value.item()
    return value
