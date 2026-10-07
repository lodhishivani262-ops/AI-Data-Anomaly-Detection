"""In-memory dataset storage and schema-agnostic column-role inference.

Phase 1 explicitly avoids a database: uploaded datasets live in a process-wide
dict keyed by a generated ``dataset_id``. This is intentional per the project
brief and is documented here and in the README.
"""
from __future__ import annotations

import io
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import pandas as pd

from app.models.dataset import ColumnRoles
from app.utils.validation import (
    DatasetValidationError,
    validate_dataframe_shape,
    validate_extension,
    validate_file_size,
)

# Heuristic keyword sets used only to *prioritise* candidate columns. Nothing
# here assumes the UCI Online Retail schema specifically -- they are generic
# transaction-dataset vocabulary that a fixed schema is never required to match.
_ID_KEYWORDS = ("id", "invoice", "code", "number", "no", "sku", "uuid")
_QUANTITY_KEYWORDS = ("quantity", "qty", "units", "count")
_UNIT_PRICE_KEYWORDS = ("unitprice", "unit_price", "price", "rate", "cost")
_AMOUNT_KEYWORDS = ("amount", "total", "revenue", "sales", "value")


@dataclass
class StoredDataset:
    dataset_id: str
    filename: str
    dataframe: pd.DataFrame
    roles: ColumnRoles
    uploaded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    anomaly_response: Optional[Any] = None


class DatasetManager:
    """Process-wide, in-memory registry of uploaded datasets."""

    def __init__(self) -> None:
        self._store: Dict[str, StoredDataset] = {}

    # ------------------------------------------------------------------
    # Upload / parsing
    # ------------------------------------------------------------------
    def load_from_upload(self, filename: str, content: bytes) -> StoredDataset:
        ext = validate_extension(filename)
        validate_file_size(len(content))

        try:
            if ext == ".csv":
                df = pd.read_csv(io.BytesIO(content))
            else:
                df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
        except pd.errors.EmptyDataError as exc:
            raise DatasetValidationError("Uploaded file is empty or contains no data.") from exc
        except (pd.errors.ParserError, ValueError, UnicodeDecodeError) as exc:
            raise DatasetValidationError(
                f"Uploaded file could not be parsed as a valid {ext} file: {exc}"
            ) from exc
        except Exception as exc:  # noqa: BLE001 - convert any parser failure cleanly
            raise DatasetValidationError(
                "Uploaded file is malformed and could not be read."
            ) from exc

        # Drop fully-empty unnamed columns that pandas sometimes creates from
        # trailing delimiters, without silently dropping real data columns.
        df = df.loc[:, ~df.columns.astype(str).str.match(r"^Unnamed: \d+$") | df.notna().any()]
        df.columns = [str(c).strip() for c in df.columns]

        validate_dataframe_shape(rows=len(df), columns=len(df.columns))

        roles = infer_column_roles(df)
        df = apply_derived_amount(df, roles)

        dataset_id = str(uuid.uuid4())
        stored = StoredDataset(dataset_id=dataset_id, filename=filename, dataframe=df, roles=roles)
        self._store[dataset_id] = stored
        return stored

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------
    def get(self, dataset_id: str) -> StoredDataset:
        stored = self._store.get(dataset_id)
        if stored is None:
            raise DatasetValidationError(
                f"Dataset '{dataset_id}' was not found. It may not have been uploaded, "
                "or the server may have restarted (datasets are stored in memory only).",
                status_code=404,
            )
        return stored

    def exists(self, dataset_id: str) -> bool:
        return dataset_id in self._store


# A single process-wide instance shared by the API layer (simple, sufficient
# for Phase 1's in-memory, no-database design).
dataset_manager = DatasetManager()


# ---------------------------------------------------------------------------
# Column role inference
# ---------------------------------------------------------------------------
def _tokenize(col: str) -> set:
    """Split a column name into lowercase word tokens.

    Handles snake_case, kebab-case, spaces, and camelCase (e.g. "UnitPrice"
    -> {"unit", "price"}) so keyword matching is on whole words, not raw
    substrings (avoiding false positives like "count" inside "discount").
    """
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", col)
    words = re.split(r"[^a-zA-Z0-9]+", spaced)
    return {w.lower() for w in words if w}


def _name_matches(col: str, keywords) -> bool:
    """Whole-word match against a column's tokenized name.

    Matches when a keyword equals one of the column's word tokens (e.g.
    "unit_price" -> {"unit", "price"} matches "price"), or when it equals the
    full concatenation of tokens (e.g. "unitprice" with no separators). This
    deliberately avoids raw substring matching, which would wrongly match
    "count" inside "discount".
    """
    tokens = _tokenize(col)
    full = "".join(tokens)
    for kw in keywords:
        if kw in tokens:
            return True
        if full == kw:
            return True
    return False


def infer_column_roles(df: pd.DataFrame) -> ColumnRoles:
    """Infer semantic roles for each column without assuming a fixed schema."""

    n_rows = len(df)
    numerical, categorical, datetime_cols, identifier_cols = [], [], [], []
    quantity_cols, unit_price_cols = [], []

    for col in df.columns:
        series = df[col]

        # --- datetime detection --------------------------------------
        if pd.api.types.is_datetime64_any_dtype(series):
            datetime_cols.append(col)
            continue
        if (
            pd.api.types.is_string_dtype(series)
            or pd.api.types.is_object_dtype(series)
            or series.dtype == object
        ) and _looks_like_datetime(series):
            datetime_cols.append(col)
            continue

        # --- identifier detection -------------------------------------
        unique_ratio = series.nunique(dropna=True) / n_rows if n_rows else 0
        is_value_like = _name_matches(col, _AMOUNT_KEYWORDS) or _name_matches(
            col, _UNIT_PRICE_KEYWORDS
        ) or _name_matches(col, _QUANTITY_KEYWORDS)
        if _name_matches(col, _ID_KEYWORDS) and not is_value_like:
            identifier_cols.append(col)
            continue
        if (
            pd.api.types.is_numeric_dtype(series)
            and unique_ratio > 0.95
            and n_rows > 20
            and not is_value_like
        ):
            # Near-unique numeric column with no recognizable measure meaning -> id-like.
            identifier_cols.append(col)
            continue

        # --- numeric vs categorical ------------------------------------
        if pd.api.types.is_numeric_dtype(series):
            numerical.append(col)
            if _name_matches(col, _QUANTITY_KEYWORDS):
                quantity_cols.append(col)
            if _name_matches(col, _UNIT_PRICE_KEYWORDS):
                unit_price_cols.append(col)
        else:
            categorical.append(col)

    amount_column = _find_amount_column(df, numerical)

    return ColumnRoles(
        numerical_columns=numerical,
        categorical_columns=categorical,
        datetime_columns=datetime_cols,
        identifier_columns=identifier_cols,
        quantity_columns=quantity_cols,
        unit_price_columns=unit_price_cols,
        amount_column=amount_column,
    )


def _looks_like_datetime(series: pd.Series, sample_size: int = 50) -> bool:
    sample = series.dropna().astype(str).head(sample_size)
    if sample.empty:
        return False
    try:
        parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
    except (TypeError, ValueError):
        try:
            parsed = pd.to_datetime(sample, errors="coerce")
        except Exception:  # noqa: BLE001
            return False
    success_ratio = parsed.notna().mean()
    return bool(success_ratio >= 0.8)


def _find_amount_column(df: pd.DataFrame, numerical_cols) -> Optional[str]:
    for col in numerical_cols:
        if _name_matches(col, _AMOUNT_KEYWORDS):
            return col
    return None


def apply_derived_amount(df: pd.DataFrame, roles: ColumnRoles) -> pd.DataFrame:
    """Derive amount = quantity * unit_price when no amount column exists.

    This directly satisfies the UCI Online Retail case (Quantity * UnitPrice)
    while remaining generic: it only fires when exactly one quantity-like and
    one price-like column were found and no amount column already exists.
    """
    if roles.amount_column is not None:
        return df
    if len(roles.quantity_columns) != 1 or len(roles.unit_price_columns) != 1:
        return df

    qty_col = roles.quantity_columns[0]
    price_col = roles.unit_price_columns[0]
    df = df.copy()
    df["amount"] = df[qty_col] * df[price_col]
    roles.amount_column = "amount"
    roles.numerical_columns.append("amount")
    return df
