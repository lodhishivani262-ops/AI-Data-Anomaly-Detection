"""Dataset upload endpoint."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models.dataset import DatasetUploadResponse
from app.services.dataset_manager import dataset_manager
from app.utils.validation import DatasetValidationError

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetUploadResponse:
    try:
        content = await file.read()
        stored = dataset_manager.load_from_upload(filename=file.filename or "", content=content)
    except DatasetValidationError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    except Exception as exc:  # noqa: BLE001 - never leak internals to the client
        raise HTTPException(status_code=400, detail="Failed to process uploaded file.") from exc

    return DatasetUploadResponse(
        dataset_id=stored.dataset_id,
        filename=stored.filename,
        rows=len(stored.dataframe),
        columns=len(stored.dataframe.columns),
        column_names=list(stored.dataframe.columns),
        roles=stored.roles,
        uploaded_at=stored.uploaded_at,
    )
