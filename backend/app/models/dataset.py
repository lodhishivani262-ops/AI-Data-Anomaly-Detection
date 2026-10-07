"""Pydantic models related to dataset upload and metadata."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ColumnRoles(BaseModel):
    """Automatically inferred semantic roles for the columns of a dataset."""

    numerical_columns: List[str] = Field(default_factory=list)
    categorical_columns: List[str] = Field(default_factory=list)
    datetime_columns: List[str] = Field(default_factory=list)
    identifier_columns: List[str] = Field(default_factory=list)
    quantity_columns: List[str] = Field(default_factory=list)
    unit_price_columns: List[str] = Field(default_factory=list)
    amount_column: Optional[str] = None


class DatasetUploadResponse(BaseModel):
    """Response returned immediately after a dataset is uploaded."""

    dataset_id: str
    filename: str
    rows: int
    columns: int
    column_names: List[str]
    roles: ColumnRoles
    uploaded_at: datetime
    message: str = "Dataset uploaded and validated successfully."


class DatasetSummary(BaseModel):
    """Lightweight summary of a stored dataset."""

    dataset_id: str
    filename: str
    rows: int
    columns: int
    uploaded_at: datetime
