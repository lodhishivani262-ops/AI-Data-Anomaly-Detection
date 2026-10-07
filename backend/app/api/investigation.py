from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.models.investigation import InvestigationRequest, InvestigationResponse
from app.services.dataset_manager import dataset_manager
from app.services.evidence_selector import gather_evidence
from app.services.llm_client import generate_explanation, is_llm_configured
from app.utils.validation import DatasetValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/investigation", tags=["investigation"])


@router.post("/chat", response_model=InvestigationResponse)
async def investigate(payload: InvestigationRequest) -> InvestigationResponse:
    try:
        stored = dataset_manager.get(payload.dataset_id)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    try:
        evidence = gather_evidence(stored, payload.message, payload.context)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to gather evidence for investigation.") from exc

    if not is_llm_configured():
        return InvestigationResponse(
            dataset_id=payload.dataset_id,
            message=payload.message,
            reply=(
                "AI explanations are not available yet -- the server has no LLM API key "
                "configured. Here is the relevant structured evidence the ML/analytics "
                "pipeline found for your question."
            ),
            based_on_ml_analysis=True,
            evidence=evidence,
            llm_available=False,
            note="Set GEMINI_API_KEY on the backend to enable AI-generated explanations.",
        )

    try:
        reply = await generate_explanation(payload.message, evidence)
    except Exception as exc:
        logger.warning("LLM call failed: %s", exc)
        return InvestigationResponse(
            dataset_id=payload.dataset_id,
            message=payload.message,
            reply=(
                "The AI explanation service is temporarily unavailable. Here is the "
                "relevant structured evidence the ML/analytics pipeline found for your question."
            ),
            based_on_ml_analysis=True,
            evidence=evidence,
            llm_available=False,
            note="The LLM request failed; showing evidence only.",
        )

    return InvestigationResponse(
        dataset_id=payload.dataset_id,
        message=payload.message,
        reply=reply,
        based_on_ml_analysis=True,
        evidence=evidence,
        llm_available=True,
    )