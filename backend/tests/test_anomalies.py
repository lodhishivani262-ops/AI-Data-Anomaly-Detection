from __future__ import annotations


def _upload(client, content, filename="data.csv"):
    response = client.post(
        "/api/datasets/upload",
        files={"file": (filename, content, "text/csv")},
    )
    assert response.status_code == 200
    return response.json()["dataset_id"]


def test_anomaly_detection_finds_injected_outliers(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/anomalies")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is True
    assert body["method"] == "isolation_forest"
    assert body["anomaly_count"] > 0

    # The 5 injected extreme rows (huge quantity + unit_price) should be
    # among the flagged anomalies' original values.
    flagged_ids = {a["transaction_id"] for a in body["anomalies"]}
    assert "INV1000" in flagged_ids  # first injected outlier row


def test_anomaly_wording_avoids_fraud_claim(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/anomalies")
    body = response.json()
    assert "fraud" not in body["disclaimer"].lower() or "not confirmed fraud" in body["disclaimer"].lower()


def test_anomaly_insufficient_rows(client, small_csv_bytes):
    dataset_id = _upload(client, small_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/anomalies")
    assert response.status_code == 200
    body = response.json()
    assert body["available"] is False
    assert body["anomaly_count"] == 0
    assert "message" in body and body["message"]


def test_anomaly_evidence_fields_present(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/anomalies")
    body = response.json()
    assert body["anomaly_count"] > 0
    first = body["anomalies"][0]
    assert "evidence" in first
    assert "severity" in first
    assert first["severity"] in ("low", "medium", "high")


def test_anomaly_caching_returns_identical_result(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    res1 = client.get(f"/api/datasets/{dataset_id}/anomalies")
    assert res1.status_code == 200
    res2 = client.get(f"/api/datasets/{dataset_id}/anomalies")
    assert res2.status_code == 200
    assert res1.json() == res2.json()


def test_category_normalized_features_included(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/anomalies")
    body = response.json()
    features = body["features_used"]
    # Verify that category normalized features are in features_used
    assert any("z_cat_" in f for f in features)
    assert any("ratio_to_cat_median_" in f for f in features)

