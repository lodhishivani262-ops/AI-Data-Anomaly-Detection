"""Validation helpers for uploaded dataset files."""
from __future__ import annotations

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}

# 25 MB max upload size. Kept generous but bounded so the in-memory store
# (there is no database in Phase 1) cannot be trivially exhausted.
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

MAX_ROWS = 500_000
MAX_COLUMNS = 500


class DatasetValidationError(Exception):
    """Raised when an uploaded dataset fails validation.

    ``status_code`` lets the API layer translate this into a clean HTTP
    error without ever leaking a stack trace to the client.
    """

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def validate_extension(filename: str) -> str:
    if not filename or "." not in filename:
        raise DatasetValidationError(
            "Uploaded file has no extension. Only .csv and .xlsx files are supported."
        )
    ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise DatasetValidationError(
            f"Unsupported file extension '{ext}'. Only .csv and .xlsx files are supported."
        )
    return ext


def validate_file_size(size_bytes: int) -> None:
    if size_bytes <= 0:
        raise DatasetValidationError("Uploaded file is empty.")
    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise DatasetValidationError(
            f"Uploaded file exceeds the maximum allowed size of "
            f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )


def validate_dataframe_shape(rows: int, columns: int) -> None:
    if rows == 0:
        raise DatasetValidationError("Uploaded dataset has no data rows.")
    if columns == 0:
        raise DatasetValidationError("Uploaded dataset has no columns.")
    if rows > MAX_ROWS:
        raise DatasetValidationError(
            f"Dataset has {rows} rows, exceeding the maximum allowed of {MAX_ROWS}."
        )
    if columns > MAX_COLUMNS:
        raise DatasetValidationError(
            f"Dataset has {columns} columns, exceeding the maximum allowed of {MAX_COLUMNS}."
        )
