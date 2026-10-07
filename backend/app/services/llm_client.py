from __future__ import annotations

import json
import logging
import os
from typing import List

import httpx
import truststore

from app.models.investigation import EvidenceReference

# Use OS trust store (fixes SSL verify failures on Windows with corporate AV/proxies).
truststore.inject_into_ssl()

logger = logging.getLogger(__name__)

# Default model and fallbacks for high availability during demand spikes (503) or deprecations (404).
DEFAULT_MODEL = "gemini-3.5-flash-lite"
FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"]

SYSTEM_PROMPT = """You are the explanation layer of an AI transaction-anomaly investigation tool.

You are given:
- a user question
- a list of structured evidence items already computed by a Machine Learning
  (Isolation Forest) and statistics pipeline (never by you)

Rules you MUST follow:
1. Only reference numbers, transaction IDs, and metrics that appear in the
   provided evidence. Never invent, estimate, or guess a metric.
2. Never state or imply that a transaction is confirmed fraud. Anomalies are
   "potential anomalies" or "investigation candidates" only.
3. Clearly separate evidence (what the data shows) from interpretation (what
   it might mean) in your answer.
4. If the evidence provided does not answer the question, say so plainly
   rather than fabricating an answer.
5. Be concise and analyst-friendly: short paragraphs or bullet points, no
   filler.
"""


def is_llm_configured() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY"))


async def generate_explanation(message: str, evidence: List[EvidenceReference]) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the server.")

    primary_model = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    candidate_models = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]

    evidence_payload = [e.model_dump(exclude_none=True) for e in evidence]
    user_content = (
        f"User question: {message}\n\n"
        f"Structured evidence (JSON, already computed -- do not add to it):\n"
        f"{json.dumps(evidence_payload, indent=2)}"
    )

    last_error: Exception | None = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                    json={
                        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
                        "generationConfig": {"maxOutputTokens": 2048},
                    },
                )
                response.raise_for_status()
                data = response.json()
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                text = "\n".join(p.get("text", "") for p in parts).strip()
                return text or "The model returned no explanation text."
            except httpx.HTTPStatusError as exc:
                last_error = exc
                status = exc.response.status_code
                logger.warning("Gemini model %s failed with status %d: %s", model, status, exc.response.text[:200])
                if status in (404, 429, 500, 503):
                    continue
                raise
            except Exception as exc:
                last_error = exc
                logger.warning("Error with Gemini model %s: %s", model, exc)
                continue

    if last_error:
        raise last_error
    raise RuntimeError("No candidate Gemini model succeeded.")