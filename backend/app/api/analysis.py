"""Analysis endpoints: profile, quality, anomalies, correlations, trends,
and the combined full-analysis endpoint.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.analytics.correlation import compute_correlations
from app.analytics.profiling import profile_dataset
from app.analytics.quality import assess_quality
from app.analytics.trends import analyze_trends
from app.anomaly.detector import detect_anomalies
from app.findings.engine import build_findings
from app.models.analytics import CorrelationResponse, ProfileResponse, QualityResponse, TrendResponse
from app.models.findings import AnomalyResponse, FullAnalysisResponse
from app.services.dataset_manager import dataset_manager
from app.utils.validation import DatasetValidationError

router = APIRouter(prefix="/api/datasets", tags=["analysis"])


def _get_stored_or_404(dataset_id: str):
    try:
        return dataset_manager.get(dataset_id)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/{dataset_id}/profile", response_model=ProfileResponse)
async def get_profile(dataset_id: str) -> ProfileResponse:
    stored = _get_stored_or_404(dataset_id)
    try:
        return profile_dataset(stored)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to profile dataset.") from exc


@router.get("/{dataset_id}/quality", response_model=QualityResponse)
async def get_quality(dataset_id: str) -> QualityResponse:
    stored = _get_stored_or_404(dataset_id)
    try:
        return assess_quality(stored)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to assess dataset quality.") from exc


@router.get("/{dataset_id}/anomalies", response_model=AnomalyResponse)
async def get_anomalies(dataset_id: str) -> AnomalyResponse:
    stored = _get_stored_or_404(dataset_id)
    try:
        return detect_anomalies(stored)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to run anomaly detection.") from exc


@router.get("/{dataset_id}/correlations", response_model=CorrelationResponse)
async def get_correlations(dataset_id: str) -> CorrelationResponse:
    stored = _get_stored_or_404(dataset_id)
    try:
        return compute_correlations(stored)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to compute correlations.") from exc


@router.get("/{dataset_id}/trends", response_model=TrendResponse)
async def get_trends(dataset_id: str) -> TrendResponse:
    stored = _get_stored_or_404(dataset_id)
    try:
        return analyze_trends(stored)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to analyze trends.") from exc


@router.post("/{dataset_id}/analyze", response_model=FullAnalysisResponse)
async def analyze_full(dataset_id: str) -> FullAnalysisResponse:
    stored = _get_stored_or_404(dataset_id)
    try:
        profile = profile_dataset(stored)
        quality = assess_quality(stored)
        anomalies = detect_anomalies(stored)
        correlations = compute_correlations(stored)
        trends = analyze_trends(stored)
        findings = build_findings(
            dataset_id=dataset_id,
            quality=quality,
            anomalies=anomalies,
            correlations=correlations,
            trends=trends,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Full analysis failed.") from exc

    return FullAnalysisResponse(
        dataset_id=dataset_id,
        profile=profile,
        quality=quality,
        anomalies=anomalies,
        correlations=correlations,
        trends=trends,
        findings=findings,
    )
