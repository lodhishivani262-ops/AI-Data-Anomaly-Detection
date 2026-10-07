from __future__ import annotations

from typing import List, Optional

from app.analytics.correlation import compute_correlations
from app.analytics.quality import assess_quality
from app.analytics.trends import analyze_trends
from app.anomaly.detector import detect_anomalies
from app.findings.engine import build_findings
from app.models.investigation import EvidenceReference, InvestigationContext
from app.services.dataset_manager import StoredDataset

MAX_EVIDENCE_ITEMS = 8


def gather_evidence(
    stored: StoredDataset, message: str, context: Optional[InvestigationContext]
) -> List[EvidenceReference]:
    quality = assess_quality(stored)
    anomalies = detect_anomalies(stored)
    correlations = compute_correlations(stored)
    trends = analyze_trends(stored)
    findings = build_findings(
        dataset_id=stored.dataset_id,
        quality=quality,
        anomalies=anomalies,
        correlations=correlations,
        trends=trends,
    )

    evidence: List[EvidenceReference] = []
    lowered = message.lower()

    if context:
        if context.transaction_id:
            match = next(
                (a for a in anomalies.anomalies if a.transaction_id == context.transaction_id),
                None,
            )
            if match:
                evidence.append(_anomaly_to_evidence(match))
        if context.row_index is not None:
            match = next((a for a in anomalies.anomalies if a.row_index == context.row_index), None)
            if match and not any(e.row_index == match.row_index for e in evidence):
                evidence.append(_anomaly_to_evidence(match))
        if context.finding_id:
            match = next((f for f in findings.findings if f.id == context.finding_id), None)
            if match:
                evidence.append(
                    EvidenceReference(
                        type="finding",
                        id=match.id,
                        summary=match.description,
                        metrics=match.metrics,
                    )
                )

    if any(k in lowered for k in ("unusual", "anomaly", "anomalies", "outlier", "suspicious", "flagged")):
        for a in anomalies.anomalies[:5]:
            if not any(e.row_index == a.row_index for e in evidence):
                evidence.append(_anomaly_to_evidence(a))

    if any(k in lowered for k in ("quality", "missing", "duplicate", "data issue")):
        for f in findings.findings:
            if f.type == "data_quality" and len(evidence) < MAX_EVIDENCE_ITEMS:
                evidence.append(
                    EvidenceReference(type="quality", id=f.id, summary=f.description, metrics=f.metrics)
                )

    if any(k in lowered for k in ("correlat", "relationship", "related")):
        for pair in correlations.pairs[:3]:
            evidence.append(
                EvidenceReference(
                    type="correlation",
                    summary=f"{pair.column_a} vs {pair.column_b}: {pair.strength} ({pair.coefficient})",
                    metrics={"coefficient": pair.coefficient, "strength": pair.strength},
                )
            )

    if any(k in lowered for k in ("trend", "period", "over time", "spike", "drop", "sales period")):
        if trends.available:
            for change in trends.notable_changes[:3]:
                evidence.append(
                    EvidenceReference(
                        type="trend",
                        summary=change.change_description,
                        metrics={"period": change.period, "z_score": change.z_score},
                    )
                )

    if not evidence:
        for a in anomalies.anomalies[:3]:
            evidence.append(_anomaly_to_evidence(a))
        if findings.findings:
            top = findings.findings[0]
            evidence.append(
                EvidenceReference(type="finding", id=top.id, summary=top.description, metrics=top.metrics)
            )

    return evidence[:MAX_EVIDENCE_ITEMS]


def _anomaly_to_evidence(anomaly) -> EvidenceReference:
    return EvidenceReference(
        type="anomaly",
        row_index=anomaly.row_index,
        transaction_id=anomaly.transaction_id,
        summary=(
            f"Row {anomaly.row_index}"
            + (f" (transaction {anomaly.transaction_id})" if anomaly.transaction_id else "")
            + f": severity={anomaly.severity}, anomaly_score={anomaly.anomaly_score}, "
            f"percentile={anomaly.evidence.percentile}"
        ),
        metrics={
            "anomaly_score": anomaly.anomaly_score,
            "severity": anomaly.severity,
            "percentile": anomaly.evidence.percentile,
            "median": anomaly.evidence.median,
            "deviation_from_median": anomaly.evidence.deviation_from_median,
            **{f"value.{k}": v for k, v in anomaly.original_values.items() if v is not None},
        },
    )