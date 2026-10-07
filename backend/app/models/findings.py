"""Pydantic models for anomaly detection results and combined findings."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------
class AnomalyEvidence(BaseModel):
    percentile: Optional[float] = None
    median: Optional[float] = None
    mean: Optional[float] = None
    iqr: Optional[float] = None
    deviation_from_median: Optional[float] = None
    feature_values: Dict[str, float] = Field(default_factory=dict)


class AnomalyRecord(BaseModel):
    row_index: int
    transaction_id: Optional[str] = None
    anomaly_score: float
    severity: str
    original_values: Dict[str, Any] = Field(default_factory=dict)
    evidence: AnomalyEvidence
    label: str = "investigation candidate"


class AnomalyResponse(BaseModel):
    dataset_id: str
    method: str
    available: bool
    total_rows: int
    anomaly_count: int
    contamination: Optional[float] = None
    features_used: List[str] = Field(default_factory=list)
    anomalies: List[AnomalyRecord] = Field(default_factory=list)
    message: Optional[str] = None
    disclaimer: str = (
        "These are statistically unusual transactions (potential anomalies / "
        "investigation candidates), not confirmed fraud."
    )


# ---------------------------------------------------------------------------
# Findings
# ---------------------------------------------------------------------------
class Finding(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    description: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    affected_columns: List[str] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class FindingsResponse(BaseModel):
    dataset_id: str
    findings: List[Finding] = Field(default_factory=list)
    total_findings: int = 0


class FullAnalysisResponse(BaseModel):
    dataset_id: str
    profile: Any
    quality: Any
    anomalies: Any
    correlations: Any
    trends: Any
    findings: FindingsResponse
