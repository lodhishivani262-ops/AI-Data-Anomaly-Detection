"""Combine data-quality, anomaly, correlation, and trend results into a
deterministic list of structured findings. No LLM involved -- every finding
is generated from concrete, previously-calculated evidence.
"""
from __future__ import annotations

import hashlib
from typing import List

from app.models.analytics import CorrelationResponse, QualityResponse, TrendResponse
from app.models.findings import AnomalyResponse, Finding, FindingsResponse


def _finding_id(*parts: str) -> str:
    raw = "|".join(parts)
    return "fnd_" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def build_findings(
    dataset_id: str,
    quality: QualityResponse,
    anomalies: AnomalyResponse,
    correlations: CorrelationResponse,
    trends: TrendResponse,
) -> FindingsResponse:
    findings: List[Finding] = []

    findings.extend(_quality_findings(dataset_id, quality))
    findings.extend(_anomaly_findings(dataset_id, anomalies))
    findings.extend(_correlation_findings(dataset_id, correlations))
    findings.extend(_trend_findings(dataset_id, trends))

    return FindingsResponse(dataset_id=dataset_id, findings=findings, total_findings=len(findings))


def _quality_findings(dataset_id: str, quality: QualityResponse) -> List[Finding]:
    findings = []

    for mv in quality.missing_values:
        if mv.missing_percentage >= 5.0:
            severity = "high" if mv.missing_percentage >= 30 else "medium"
            findings.append(
                Finding(
                    id=_finding_id(dataset_id, "missing", mv.column),
                    type="data_quality",
                    severity=severity,
                    title=f"Missing values in '{mv.column}'",
                    description=(
                        f"Column '{mv.column}' has {mv.missing_count} missing values "
                        f"({mv.missing_percentage}% of rows)."
                    ),
                    evidence={"missing_count": mv.missing_count, "missing_percentage": mv.missing_percentage},
                    affected_columns=[mv.column],
                    metrics={"missing_percentage": mv.missing_percentage},
                )
            )

    if quality.duplicates.duplicate_row_count > 0:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "duplicates"),
                type="data_quality",
                severity="medium" if quality.duplicates.duplicate_percentage < 10 else "high",
                title="Duplicate rows detected",
                description=(
                    f"{quality.duplicates.duplicate_row_count} duplicate rows "
                    f"({quality.duplicates.duplicate_percentage}%) were found in the dataset."
                ),
                evidence={"sample_row_indices": quality.duplicates.sample_row_indices},
                affected_columns=[],
                metrics={"duplicate_percentage": quality.duplicates.duplicate_percentage},
            )
        )

    for cc in quality.constant_columns:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "constant", cc.column),
                type="data_quality",
                severity="low",
                title=f"Constant column '{cc.column}'",
                description=(
                    f"Column '{cc.column}' has a single constant value "
                    f"('{cc.constant_value}') across all rows and carries no analytical signal."
                ),
                evidence={"constant_value": cc.constant_value},
                affected_columns=[cc.column],
                metrics={},
            )
        )

    for hc in quality.high_cardinality_columns:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "high_card", hc.column),
                type="data_quality",
                severity="low",
                title=f"High-cardinality column '{hc.column}'",
                description=(
                    f"Column '{hc.column}' has {hc.unique_count} unique values "
                    f"({round(hc.unique_ratio * 100, 1)}% of rows), suggesting it may behave "
                    "like an identifier rather than a categorical feature."
                ),
                evidence={"unique_count": hc.unique_count, "unique_ratio": hc.unique_ratio},
                affected_columns=[hc.column],
                metrics={"unique_ratio": hc.unique_ratio},
            )
        )

    for st in quality.suspicious_types:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "suspicious_type", st.column),
                type="data_quality",
                severity="low",
                title=f"Suspicious data type in '{st.column}'",
                description=f"{st.issue} (declared dtype: {st.declared_dtype}).",
                evidence={"declared_dtype": st.declared_dtype},
                affected_columns=[st.column],
                metrics={},
            )
        )

    for iv in quality.invalid_values:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "invalid", iv.column, iv.issue),
                type="data_quality",
                severity="medium",
                title=f"Invalid values in '{iv.column}'",
                description=f"{iv.issue} ({iv.invalid_count} affected rows).",
                evidence={"sample_row_indices": iv.sample_row_indices},
                affected_columns=[iv.column],
                metrics={"invalid_count": iv.invalid_count},
            )
        )

    return findings


def _anomaly_findings(dataset_id: str, anomalies: AnomalyResponse) -> List[Finding]:
    if not anomalies.available or anomalies.anomaly_count == 0:
        return []

    findings = [
        Finding(
            id=_finding_id(dataset_id, "anomaly_summary"),
            type="anomaly",
            severity="medium",
            title=f"{anomalies.anomaly_count} potential anomalies detected",
            description=(
                f"Isolation Forest flagged {anomalies.anomaly_count} of {anomalies.total_rows} "
                "rows as statistically unusual (investigation candidates, not confirmed fraud)."
            ),
            evidence={"features_used": anomalies.features_used},
            affected_columns=anomalies.features_used,
            metrics={"anomaly_count": anomalies.anomaly_count, "total_rows": anomalies.total_rows},
        )
    ]

    high_severity = [a for a in anomalies.anomalies if a.severity == "high"]
    for anomaly in high_severity[:10]:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "anomaly_row", str(anomaly.row_index)),
                type="anomaly",
                severity="high",
                title=f"High-severity investigation candidate at row {anomaly.row_index}",
                description=(
                    f"Row {anomaly.row_index}"
                    + (f" (transaction {anomaly.transaction_id})" if anomaly.transaction_id else "")
                    + " is a potential anomaly warranting investigation."
                ),
                evidence=anomaly.evidence.model_dump(),
                affected_columns=list(anomaly.evidence.feature_values.keys()),
                metrics={"anomaly_score": anomaly.anomaly_score, "percentile": anomaly.evidence.percentile},
            )
        )

    return findings


def _correlation_findings(dataset_id: str, correlations: CorrelationResponse) -> List[Finding]:
    findings = []
    for pair in correlations.pairs:
        if pair.strength in ("strong", "moderate"):
            findings.append(
                Finding(
                    id=_finding_id(dataset_id, "correlation", pair.column_a, pair.column_b),
                    type="correlation",
                    severity="low",
                    title=f"{pair.strength.capitalize()} correlation between '{pair.column_a}' and '{pair.column_b}'",
                    description=(
                        f"'{pair.column_a}' and '{pair.column_b}' show a {pair.strength} "
                        f"{pair.method} correlation (coefficient={pair.coefficient}). "
                        "This does not imply causation."
                    ),
                    evidence={"coefficient": pair.coefficient, "method": pair.method},
                    affected_columns=[pair.column_a, pair.column_b],
                    metrics={"coefficient": pair.coefficient},
                )
            )
    return findings


def _trend_findings(dataset_id: str, trends: TrendResponse) -> List[Finding]:
    if not trends.available:
        return []

    findings = []
    for change in trends.notable_changes:
        findings.append(
            Finding(
                id=_finding_id(dataset_id, "trend", change.period, change.metric),
                type="trend",
                severity="medium" if abs(change.z_score) < 3 else "high",
                title=f"Notable change in {change.metric} on {change.period}",
                description=change.change_description,
                evidence={"z_score": change.z_score, "period": change.period},
                affected_columns=[trends.amount_column] if trends.amount_column else [],
                metrics={"z_score": change.z_score},
            )
        )
    return findings
