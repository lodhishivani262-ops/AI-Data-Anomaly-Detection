from __future__ import annotations


def _upload(client, content, filename="data.csv"):
    response = client.post(
        "/api/datasets/upload",
        files={"file": (filename, content, "text/csv")},
    )
    assert response.status_code == 200
    return response.json()["dataset_id"]


def test_profile_endpoint(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["rows"] == 200
    assert "quantity" in body["numerical_columns"]
    assert len(body["column_profiles"]) == body["columns"]


def test_quality_missing_values(client, missing_values_csv_bytes):
    dataset_id = _upload(client, missing_values_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/quality")
    assert response.status_code == 200
    body = response.json()
    missing_cols = {m["column"]: m for m in body["missing_values"]}
    assert "unit_price" in missing_cols
    assert missing_cols["unit_price"]["missing_percentage"] == 30.0


def test_quality_duplicates(client, duplicates_csv_bytes):
    dataset_id = _upload(client, duplicates_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/quality")
    assert response.status_code == 200
    body = response.json()
    assert body["duplicates"]["duplicate_row_count"] == 10


def test_quality_no_arbitrary_score(client, sample_csv_bytes):
    dataset_id = _upload(client, sample_csv_bytes)
    response = client.get(f"/api/datasets/{dataset_id}/quality")
    body = response.json()
    assert "quality_score" not in body
