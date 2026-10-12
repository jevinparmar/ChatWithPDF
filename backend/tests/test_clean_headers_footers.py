import pytest
from app.core.loader import DocumentPage, clean_document_pages


def test_clean_standalone_page_numbers():
    pages = [
        DocumentPage(page_number=1, text="1\nTitle of Chapter\nIntroduction text."),
        DocumentPage(page_number=2, text="Second page text.\n2"),
        DocumentPage(page_number=3, text="Page 3 of 10\nThird page body content.\n- 3 -"),
        DocumentPage(page_number=4, text="4"),  # Only page number slide
    ]

    cleaned = clean_document_pages(pages)
    assert len(cleaned) == 4
    # Page 1 top '1' stripped
    assert not cleaned[0].text.startswith("1\n")
    assert "Title of Chapter" in cleaned[0].text
    # Page 2 bottom '2' stripped
    assert not cleaned[1].text.endswith("\n2")
    assert "Second page text." in cleaned[1].text
    # Page 3 top 'Page 3 of 10' and bottom '- 3 -' stripped
    assert "Third page body content." in cleaned[2].text
    assert "Page 3 of 10" not in cleaned[2].text
    assert "- 3 -" not in cleaned[2].text
    # Page 4 (only solitary page number) becomes empty string
    assert cleaned[3].text == ""


def test_clean_running_headers_and_footers():
    running_header = "MCA : 3 05MC0301 (Software Engineering)"
    running_footer = "Confidential - Internal University Circulation"

    pages = [
        DocumentPage(page_number=i, text=f"{running_header}\nContent of page {i}\n{running_footer}")
        for i in range(1, 8)
    ]

    cleaned = clean_document_pages(pages)
    for p in cleaned:
        assert running_header not in p.text
        assert running_footer not in p.text
        assert "Content of page" in p.text
