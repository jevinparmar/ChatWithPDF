import pytest
from app.core.loader import DocumentPage
from app.core.splitter import split_document_pages


def test_chunking_preserves_page_numbers_and_order():
    page1_text = (
        "Section 1: General Policy. All employees must adhere to corporate conduct protocols. "
        "Standard hours of operation are maintained across all distributed office units. "
    ) * 5

    page2_text = (
        "Section 2: Benefits and Reimbursements. Workspace allowances are provided annually. "
        "Claims should be filed through the internal expense portal within 30 days. "
    ) * 5

    pages = [
        DocumentPage(page_number=1, text=page1_text),
        DocumentPage(page_number=2, text=page2_text),
    ]

    chunks = split_document_pages(pages, chunk_size=250, chunk_overlap=40)

    assert len(chunks) > 2, "Should produce multiple chunks"

    # Check page 1 chunks
    page_1_chunks = [c for c in chunks if c.page_number == 1]
    assert len(page_1_chunks) >= 1
    for c in page_1_chunks:
        assert c.page_number == 1
        assert "Section 1" in c.content or "employees" in c.content

    # Check page 2 chunks
    page_2_chunks = [c for c in chunks if c.page_number == 2]
    assert len(page_2_chunks) >= 1
    for c in page_2_chunks:
        assert c.page_number == 2
        assert "Section 2" in c.content or "Benefits" in c.content

    # Check contiguous monotonic indexing
    indices = [c.chunk_index for c in chunks]
    assert indices == list(range(len(chunks))), "Chunk indices must be contiguous and ordered"
