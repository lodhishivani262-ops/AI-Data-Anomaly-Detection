from __future__ import annotations


def _upload(client, content, filename="data.csv"):
    response = client.post(
        "/api/datasets/upload",
        files={"file": (filename, content, "text/csv")},
    )
    assert response.status_code == 200
    return response.json()["dataset_id"]


def test_correlations(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/correlations")
    assert response.status_code == 200
    body = response.json()
    assert body["method"] == "pearson"
    assert "does not imply causation" in (body.get("note") or "").lower()


def test_trends_available(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/trends")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert len(body["points"]) > 0


def test_trends_unavailable_without_datetime(client, no_datetime_csv_bytes):
    dataset_id = _upload(client, no_datetime_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/trends")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert "message" in body and body["message"]


def test_findings_endpoint(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/findings")
    assert response.status_code == 200
    body = response.json()
    assert body["total_findings"] == len(body["findings"])
    if body["findings"]:
        finding = body["findings"][0]
        for key in ("id", "type", "severity", "title", "description", "evidence", "affected_columns", "metrics"):
            assert key in finding


def test_missing_dataset_returns_404(client):
    response = client.get("/api/datasets/nonexistent-id/profile")
    assert response.status_code == 404


def test_full_analysis(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.post(f"/api/datasets/{dataset_id}/analyze")
    assert response.status_code == 200
    body = response.json()
    for key in ("profile", "quality", "anomalies", "correlations", "trends", "findings"):
        assert key in body
    assert body["anomalies"]["available"] is True
    assert body["findings"]["total_findings"] >= 1
