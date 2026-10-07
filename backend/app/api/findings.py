"""Standalone findings endpoint (recomputes quality/anomalies/correlations/
trends and combines them, without returning the full analysis payload).
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.analytics.correlation import compute_correlations
from app.analytics.quality import assess_quality
from app.analytics.trends import analyze_trends
from app.anomaly.detector import detect_anomalies
from app.findings.engine import build_findings
from app.models.findings import FindingsResponse
from app.services.dataset_manager import dataset_manager
from app.utils.validation import DatasetValidationError

router = APIRouter(prefix="/api/datasets", tags=["findings"])


@router.get("/{dataset_id}/findings", response_model=FindingsResponse)
async def get_findings(dataset_id: str) -> FindingsResponse:
    try:
        stored = dataset_manager.get(dataset_id)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    try:
        quality = assess_quality(stored)
        anomalies = detect_anomalies(stored)
        correlations = compute_correlations(stored)
        trends = analyze_trends(stored)
        return build_findings(
            dataset_id=dataset_id,
            quality=quality,
            anomalies=anomalies,
            correlations=correlations,
            trends=trends,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to build findings.") from exc
