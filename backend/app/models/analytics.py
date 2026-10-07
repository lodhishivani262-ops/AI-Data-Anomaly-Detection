"""Pydantic models for profiling, data-quality, correlation, and trend outputs."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Profiling
# ---------------------------------------------------------------------------
class ColumnProfile(BaseModel):
    name: str
    dtype: str
    role: str
    unique_count: int
    missing_count: int
    missing_percentage: float
    stats: Dict[str, Any] = Field(default_factory=dict)


class ProfileResponse(BaseModel):
    dataset_id: str
    rows: int
    columns: int
    column_names: List[str]
    numerical_columns: List[str]
    categorical_columns: List[str]
    datetime_columns: List[str]
    identifier_columns: List[str]
    column_profiles: List[ColumnProfile]


# ---------------------------------------------------------------------------
# Data Quality
# ---------------------------------------------------------------------------
class MissingValueInfo(BaseModel):
    column: str
    missing_count: int
    missing_percentage: float


class DuplicateInfo(BaseModel):
    duplicate_row_count: int
    duplicate_percentage: float
    sample_row_indices: List[int] = Field(default_factory=list)


class ConstantColumnInfo(BaseModel):
    column: str
    constant_value: Any


class HighCardinalityInfo(BaseModel):
    column: str
    unique_count: int
    unique_ratio: float


class SuspiciousTypeInfo(BaseModel):
    column: str
    declared_dtype: str
    issue: str


class InvalidValueInfo(BaseModel):
    column: str
    issue: str
    invalid_count: int
    sample_row_indices: List[int] = Field(default_factory=list)


class QualityResponse(BaseModel):
    dataset_id: str
    total_rows: int
    total_columns: int
    missing_values: List[MissingValueInfo] = Field(default_factory=list)
    duplicates: DuplicateInfo
    constant_columns: List[ConstantColumnInfo] = Field(default_factory=list)
    high_cardinality_columns: List[HighCardinalityInfo] = Field(default_factory=list)
    suspicious_types: List[SuspiciousTypeInfo] = Field(default_factory=list)
    invalid_values: List[InvalidValueInfo] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Correlation
# ---------------------------------------------------------------------------
class CorrelationPair(BaseModel):
    column_a: str
    column_b: str
    coefficient: float
    method: str
    strength: str


class CorrelationResponse(BaseModel):
    dataset_id: str
    method: str
    columns_considered: List[str]
    pairs: List[CorrelationPair]
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------
class TrendPoint(BaseModel):
    period: str
    transaction_count: int
    total_amount: float
    average_amount: float


class NotableChange(BaseModel):
    period: str
    metric: str
    change_description: str
    z_score: float


class TrendResponse(BaseModel):
    dataset_id: str
    available: bool
    datetime_column: Optional[str] = None
    amount_column: Optional[str] = None
    granularity: Optional[str] = None
    points: List[TrendPoint] = Field(default_factory=list)
    notable_changes: List[NotableChange] = Field(default_factory=list)
    message: Optional[str] = None
