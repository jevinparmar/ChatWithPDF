import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import List
import docx
import pymupdf

from app.utils.logger import logger


@dataclass
class DocumentPage:
    page_number: int
    text: str


def _load_pdf(file_path: Path) -> List[DocumentPage]:
    pages: List[DocumentPage] = []
    doc = pymupdf.open(str(file_path))
    try:
        for idx in range(len(doc)):
            page = doc[idx]
            page_text = page.get_text() or ""
            pages.append(DocumentPage(page_number=idx + 1, text=page_text.strip()))
    finally:
        doc.close()
    return pages


def _load_docx(file_path: Path) -> List[DocumentPage]:
    doc = docx.Document(str(file_path))
    paragraphs: List[str] = []
    for p in doc.paragraphs:
        if p.text.strip():
            paragraphs.append(p.text.strip())

    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                paragraphs.append(row_text)

    full_text = "\n\n".join(paragraphs)
    if not full_text:
        return [DocumentPage(page_number=1, text="")]

    # Split logical pages by ~2500 chars
    chunk_size = 2500
    pages: List[DocumentPage] = []
    current_page = 1
    for i in range(0, len(full_text), chunk_size):
        page_text = full_text[i : i + chunk_size].strip()
        pages.append(DocumentPage(page_number=current_page, text=page_text))
        current_page += 1
    return pages


def _load_txt(file_path: Path) -> List[DocumentPage]:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_text = f.read()
    except UnicodeDecodeError:
        with open(file_path, "r", encoding="latin-1") as f:
            full_text = f.read()

    full_text = full_text.strip()
    if not full_text:
        return [DocumentPage(page_number=1, text="")]

    chunk_size = 2500
    pages: List[DocumentPage] = []
    current_page = 1
    for i in range(0, len(full_text), chunk_size):
        page_text = full_text[i : i + chunk_size].strip()
        pages.append(DocumentPage(page_number=current_page, text=page_text))
        current_page += 1
    return pages


def extract_document_pages(file_path: Path, file_type: str) -> List[DocumentPage]:
    """Extracts text per page synchronously."""
    t = file_type.lower()
    if t == "pdf":
        return _load_pdf(file_path)
    elif t == "docx":
        return _load_docx(file_path)
    elif t == "txt":
        return _load_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_type}")


async def extract_document_pages_async(file_path: Path, file_type: str) -> List[DocumentPage]:
    """Runs document parsing asynchronously in a worker thread to keep event loop free."""
    return await asyncio.to_thread(extract_document_pages, file_path, file_type)
