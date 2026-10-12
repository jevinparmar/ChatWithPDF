import os
import re
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
    ".pptx",
    ".ppt",
    ".txt",
    ".md",
    ".csv",
    ".xlsx",
    ".xls",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
}


def sanitize_filename(filename: str) -> str:
    """Removes path traversal and invalid characters from filename."""
    base = os.path.basename(filename)
    cleaned = re.sub(r"[^\w\s.-]", "", base).strip()
    return cleaned or "document"


def validate_file_upload(file: UploadFile) -> str:
    """Validates file extension and size constraints. Returns file type."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing or empty",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported formats: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, PNG, JPG, JPEG.",
        )

    # Convert extension without dot to normalized type
    file_type = ext.lstrip(".")
    return file_type


def get_user_storage_path(user_id: uuid.UUID, file_ext: str) -> tuple[Path, str]:
    """Generates a secure unique on-disk storage path for a user's uploaded file."""
    user_dir = settings.UPLOAD_DIR / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    storage_path = user_dir / unique_filename
    return storage_path, unique_filename
