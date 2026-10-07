from __future__ import annotations


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_upload_csv(client, sample_csv_bytes):
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("transactions.csv", sample_csv_bytes, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert "dataset_id" in body
    assert body["rows"] == 200
    assert "amount" in body["column_names"]  # derived quantity * unit_price
    assert body["roles"]["amount_column"] == "amount"


def test_upload_xlsx(client, sample_xlsx_bytes):
    response = client.post(
        "/api/datasets/upload",
        files={
            "file": (
                "transactions.xlsx",
                sample_xlsx_bytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["rows"] == 60


def test_upload_invalid_extension(client):
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )
    assert response.status_code == 400
    assert "extension" in response.json()["detail"].lower()


def test_upload_empty_file(client):
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400


def test_upload_malformed_csv(client):
    # Binary garbage with a .csv extension should fail cleanly, not crash.
    garbage = bytes(range(256)) * 4
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("broken.csv", garbage, "text/csv")},
    )
    assert response.status_code == 400
    assert "detail" in response.json()
