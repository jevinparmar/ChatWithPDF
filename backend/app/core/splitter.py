from dataclasses import dataclass
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings
from app.core.loader import DocumentPage


@dataclass
class ChunkData:
    page_number: int
    chunk_index: int
    content: str
    location_type: str = "page"
    location_label: str = ""


def split_document_pages(
    pages: List[DocumentPage],
    chunk_size: int = settings.CHUNK_SIZE,
    chunk_overlap: int = settings.CHUNK_OVERLAP,
) -> List[ChunkData]:
    """Splits document pages into chunks while preserving page numbers, location metadata, and order."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )

    chunks: List[ChunkData] = []
    chunk_counter = 0

    for page in pages:
        clean_text = page.text.strip()
        if not clean_text:
            continue

        loc_label = page.location_label or f"Page {page.page_number}"
        page_chunks = splitter.split_text(clean_text)
        for piece in page_chunks:
            p_clean = piece.strip()
            if p_clean:
                chunks.append(
                    ChunkData(
                        page_number=page.page_number,
                        chunk_index=chunk_counter,
                        content=p_clean,
                        location_type=page.location_type,
                        location_label=loc_label,
                    )
                )
                chunk_counter += 1

    return chunks

