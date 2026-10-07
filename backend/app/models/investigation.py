from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class InvestigationContext(BaseModel):
    transaction_id: Optional[str] = None
    finding_id: Optional[str] = None
    row_index: Optional[int] = None


class InvestigationRequest(BaseModel):
    dataset_id: str
    message: str
    context: Optional[InvestigationContext] = None


class EvidenceReference(BaseModel):
    type: str
    id: Optional[str] = None
    row_index: Optional[int] = None
    transaction_id: Optional[str] = None
    summary: str
    metrics: Dict[str, Any] = Field(default_factory=dict)


class InvestigationResponse(BaseModel):
    dataset_id: str
    message: str
    reply: str
    based_on_ml_analysis: bool = True
    evidence: List[EvidenceReference] = Field(default_factory=list)
    llm_available: bool
    note: Optional[str] = None