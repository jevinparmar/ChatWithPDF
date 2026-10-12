import asyncio
import csv
from dataclasses import dataclass
import io
from pathlib import Path
import re
from typing import List, Optional

import docx
import pymupdf

from app.utils.logger import logger


@dataclass
class DocumentPage:
    page_number: int
    text: str
    location_type: str = "page"  # 'page' | 'slide' | 'section' | 'sheet'
    location_label: str = ""     # e.g., "Page 4", "Slide 7", "Section: Introduction", "Sheet: Sales"


def clean_document_pages(pages: List[DocumentPage]) -> List[DocumentPage]:
    """
    Cleans extracted document pages by stripping:
    1. Standalone page numbers at the top or bottom of pages.
    2. Repetitive running headers and footers across pages.
    3. Excessive leading and trailing whitespace.
    Preserves location_type and location_label.
    """
    if not pages:
        return pages

    total_pages = len(pages)

    # 1. Detect repetitive running headers and footers
    header_counts: dict[str, int] = {}
    footer_counts: dict[str, int] = {}

    if total_pages >= 3:
        for p in pages:
            lines = [line.strip() for line in p.text.split("\n") if line.strip()]
            if lines:
                for top_line in lines[:2]:
                    if not re.match(r"^\d+$", top_line):
                        header_counts[top_line] = header_counts.get(top_line, 0) + 1
                for bot_line in lines[-2:]:
                    if not re.match(r"^\d+$", bot_line):
                        footer_counts[bot_line] = footer_counts.get(bot_line, 0) + 1

    threshold = max(3, int(total_pages * 0.35))
    running_headers = {line for line, count in header_counts.items() if count >= threshold}
    running_footers = {line for line, count in footer_counts.items() if count >= threshold}

    page_number_pattern = re.compile(
        r"^(?:"
        r"\d{1,4}"
        r"|(?:Page|PAGE|page)\s*\d{1,4}(?:\s*(?:of|\/|-)\s*\d{1,4})?"
        r"|[-—–\.]\s*\d{1,4}\s*[-—–\.]"
        r"|\[\s*\d{1,4}\s*\]"
        r")$"
    )

    cleaned_pages: List[DocumentPage] = []
    for p in pages:
        raw_lines = [line.strip() for line in p.text.split("\n")]
        non_empty = [line for line in raw_lines if line]

        if not non_empty:
            cleaned_pages.append(
                DocumentPage(
                    page_number=p.page_number,
                    text="",
                    location_type=p.location_type,
                    location_label=p.location_label,
                )
            )
            continue

        # Strip running headers and page numbers from the top
        while non_empty and (non_empty[0] in running_headers or page_number_pattern.match(non_empty[0])):
            non_empty.pop(0)

        # Strip running footers and page numbers from the bottom
        while non_empty and (non_empty[-1] in running_footers or page_number_pattern.match(non_empty[-1])):
            non_empty.pop()

        cleaned_text = "\n".join(non_empty).strip()
        cleaned_pages.append(
            DocumentPage(
                page_number=p.page_number,
                text=cleaned_text,
                location_type=p.location_type,
                location_label=p.location_label,
            )
        )

    return cleaned_pages


def _safe_ocr_image(image) -> str:
    """Tries to perform OCR on a PIL image using pytesseract; returns empty string if unavailable."""
    try:
        import pytesseract
        text = pytesseract.image_to_string(image)
        return text.strip() if text else ""
    except Exception as e:
        logger.debug(f"OCR skipped or failed: {e}")
        return ""


def _load_pdf(file_path: Path) -> List[DocumentPage]:
    """Loads PDF pages. Automatically uses OCR when a page has almost no text."""
    pages: List[DocumentPage] = []
    doc = pymupdf.open(str(file_path))
    try:
        for idx in range(len(doc)):
            page_num = idx + 1
            page = doc[idx]
            page_text = (page.get_text() or "").strip()

            # Automatic OCR fallback for scanned pages with little/no text
            if len(page_text) < 30:
                try:
                    from PIL import Image
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    img = Image.open(io.BytesIO(img_bytes))
                    ocr_text = _safe_ocr_image(img)
                    if ocr_text and len(ocr_text.strip()) > len(page_text):
                        page_text = ocr_text.strip()
                except Exception as e:
                    logger.debug(f"Failed to perform auto-OCR on PDF page {page_num}: {e}")

            pages.append(
                DocumentPage(
                    page_number=page_num,
                    text=page_text,
                    location_type="page",
                    location_label=f"Page {page_num}",
                )
            )
    finally:
        doc.close()
    return pages


def _load_pptx(file_path: Path) -> List[DocumentPage]:
    """Loads PPTX slides: one page per slide with title, body text, tables and speaker notes."""
    from pptx import Presentation

    prs = Presentation(str(file_path))
    pages: List[DocumentPage] = []

    for idx, slide in enumerate(prs.slides):
        slide_num = idx + 1
        title = ""
        body_lines: List[str] = []
        table_lines: List[str] = []

        for shape in slide.shapes:
            if shape == slide.shapes.title and shape.has_text_frame:
                title = shape.text.strip()
                continue

            if shape.has_text_frame:
                text = shape.text.strip()
                if text:
                    body_lines.append(text)
            elif shape.has_table:
                table = shape.table
                rows_text = []
                for row in table.rows:
                    row_cells = [cell.text.strip() for cell in row.cells]
                    if any(row_cells):
                        rows_text.append(" | ".join(row_cells))
                if rows_text:
                    table_lines.append("\n".join(rows_text))

        notes = ""
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
            notes = slide.notes_slide.notes_text_frame.text.strip()

        content_parts = []
        if title:
            content_parts.append(f"# {title}")
        if body_lines:
            content_parts.append("\n".join(body_lines))
        if table_lines:
            content_parts.append("Tables:\n" + "\n\n".join(table_lines))
        if notes:
            content_parts.append(f"Speaker Notes:\n{notes}")

        full_slide_text = "\n\n".join(content_parts).strip()
        pages.append(
            DocumentPage(
                page_number=slide_num,
                text=full_slide_text,
                location_type="slide",
                location_label=f"Slide {slide_num}",
            )
        )

    if not pages:
        return [DocumentPage(page_number=1, text="", location_type="slide", location_label="Slide 1")]
    return pages


def _load_docx(file_path: Path) -> List[DocumentPage]:
    """Loads DOCX: keeps headings, lists, tables; groups into sections and estimates page numbers."""
    doc = docx.Document(str(file_path))
    sections: List[dict] = []
    current_title = "Introduction"
    current_lines: List[str] = []

    for element in doc.element.body:
        if element.tag.endswith("p"):
            p = docx.text.paragraph.Paragraph(element, doc)
            text = p.text.strip()
            if not text:
                continue
            style_name = p.style.name if p.style else ""
            if "Heading 1" in style_name or "Heading 2" in style_name or "Title" in style_name:
                if current_lines:
                    sections.append({"title": current_title, "lines": current_lines})
                    current_lines = []
                current_title = text
            else:
                if "List" in style_name:
                    current_lines.append(f"- {text}")
                else:
                    current_lines.append(text)
        elif element.tag.endswith("tbl"):
            tbl = docx.table.Table(element, doc)
            tbl_rows = []
            for row in tbl.rows:
                cells = [c.text.strip() for c in row.cells]
                if any(cells):
                    tbl_rows.append(" | ".join(cells))
            if tbl_rows:
                current_lines.append("\n".join(tbl_rows))

    if current_lines or not sections:
        sections.append({"title": current_title, "lines": current_lines})

    pages: List[DocumentPage] = []
    current_page = 1

    for sec in sections:
        sec_title = sec["title"]
        sec_text = "\n\n".join(sec["lines"]).strip()
        if not sec_text:
            continue

        chunk_size = 2500
        if len(sec_text) <= chunk_size:
            pages.append(
                DocumentPage(
                    page_number=current_page,
                    text=f"### {sec_title}\n\n{sec_text}",
                    location_type="section",
                    location_label=f"Section: {sec_title}",
                )
            )
            current_page += 1
        else:
            for i in range(0, len(sec_text), chunk_size):
                sub_text = sec_text[i : i + chunk_size].strip()
                pages.append(
                    DocumentPage(
                        page_number=current_page,
                        text=f"### {sec_title} (Part {i//chunk_size + 1})\n\n{sub_text}",
                        location_type="section",
                        location_label=f"Section: {sec_title}",
                    )
                )
                current_page += 1

    if not pages:
        return [DocumentPage(page_number=1, text="", location_type="section", location_label="Section: Introduction")]
    return pages


def _load_xlsx(file_path: Path) -> List[DocumentPage]:
    """Loads XLSX: converts each sheet into readable text with headers."""
    import openpyxl

    wb = openpyxl.load_workbook(str(file_path), data_only=True)
    pages: List[DocumentPage] = []

    for idx, sheet_name in enumerate(wb.sheetnames):
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue

        non_empty_rows = [r for r in rows if any(cell is not None and str(cell).strip() != "" for cell in r)]
        if not non_empty_rows:
            continue

        header = [str(c).strip() if c is not None else "" for c in non_empty_rows[0]]
        formatted_rows = []
        formatted_rows.append(" | ".join(header))
        formatted_rows.append(" | ".join(["---"] * len(header)))

        for row in non_empty_rows[1:]:
            cells = [str(c).strip() if c is not None else "" for c in row]
            formatted_rows.append(" | ".join(cells))

        sheet_text = f"# Sheet: {sheet_name}\n\n" + "\n".join(formatted_rows)
        pages.append(
            DocumentPage(
                page_number=idx + 1,
                text=sheet_text.strip(),
                location_type="sheet",
                location_label=f"Sheet: {sheet_name}",
            )
        )

    if not pages:
        return [DocumentPage(page_number=1, text="", location_type="sheet", location_label="Sheet: Sheet1")]
    return pages


def _load_csv(file_path: Path) -> List[DocumentPage]:
    """Loads CSV: converts sheet into readable text with headers."""
    raw_lines = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            raw_lines = list(reader)
    except UnicodeDecodeError:
        with open(file_path, "r", encoding="latin-1") as f:
            reader = csv.reader(f)
            raw_lines = list(reader)

    if not raw_lines:
        return [DocumentPage(page_number=1, text="", location_type="sheet", location_label="Sheet: Data")]

    formatted = []
    header = raw_lines[0]
    formatted.append(" | ".join(header))
    formatted.append(" | ".join(["---"] * len(header)))
    for row in raw_lines[1:]:
        if any(cell.strip() for cell in row):
            formatted.append(" | ".join(cell.strip() for cell in row))

    csv_text = "\n".join(formatted)
    return [
        DocumentPage(
            page_number=1,
            text=csv_text.strip(),
            location_type="sheet",
            location_label="Sheet: Data",
        )
    ]


def _load_txt(file_path: Path) -> List[DocumentPage]:
    """Loads plain TXT file estimated into ~2500 character pages."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_text = f.read()
    except UnicodeDecodeError:
        with open(file_path, "r", encoding="latin-1") as f:
            full_text = f.read()

    full_text = full_text.strip()
    if not full_text:
        return [DocumentPage(page_number=1, text="", location_type="page", location_label="Page 1")]

    chunk_size = 2500
    pages: List[DocumentPage] = []
    current_page = 1
    for i in range(0, len(full_text), chunk_size):
        page_text = full_text[i : i + chunk_size].strip()
        pages.append(
            DocumentPage(
                page_number=current_page,
                text=page_text,
                location_type="page",
                location_label=f"Page {current_page}",
            )
        )
        current_page += 1
    return pages


def _load_md(file_path: Path) -> List[DocumentPage]:
    """Loads Markdown file, grouping into sections by headings."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(file_path, "r", encoding="latin-1") as f:
            content = f.read()

    sections = re.split(r"\n(?=#{1,3}\s+)", content)
    pages: List[DocumentPage] = []
    current_page = 1

    for sec in sections:
        sec_clean = sec.strip()
        if not sec_clean:
            continue
        first_line = sec_clean.split("\n", 1)[0]
        heading_match = re.match(r"^#{1,3}\s+(.*)", first_line)
        label = f"Section: {heading_match.group(1).strip()}" if heading_match else f"Section {current_page}"
        pages.append(
            DocumentPage(
                page_number=current_page,
                text=sec_clean,
                location_type="section",
                location_label=label,
            )
        )
        current_page += 1

    if not pages:
        return [DocumentPage(page_number=1, text="", location_type="section", location_label="Section: Main")]
    return pages


def _load_image(file_path: Path) -> List[DocumentPage]:
    """Loads an image (PNG, JPG, JPEG) and extracts text via OCR."""
    text = ""
    try:
        from PIL import Image
        img = Image.open(str(file_path))
        text = _safe_ocr_image(img)
    except Exception as e:
        logger.warning(f"Failed to load image for OCR {file_path}: {e}")

    return [
        DocumentPage(
            page_number=1,
            text=text.strip(),
            location_type="page",
            location_label="Page 1",
        )
    ]


def extract_document_pages(file_path: Path, file_type: str) -> List[DocumentPage]:
    """Extracts text per page/section/slide/sheet and cleans running headers/footers."""
    t = file_type.lower()
    if t == "pdf":
        raw_pages = _load_pdf(file_path)
    elif t in ("docx", "doc"):
        raw_pages = _load_docx(file_path)
    elif t in ("pptx", "ppt"):
        raw_pages = _load_pptx(file_path)
    elif t in ("xlsx", "xls"):
        raw_pages = _load_xlsx(file_path)
    elif t == "csv":
        raw_pages = _load_csv(file_path)
    elif t == "txt":
        raw_pages = _load_txt(file_path)
    elif t == "md":
        raw_pages = _load_md(file_path)
    elif t in ("png", "jpg", "jpeg", "webp"):
        raw_pages = _load_image(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_type}")

    return clean_document_pages(raw_pages)


async def extract_document_pages_async(file_path: Path, file_type: str) -> List[DocumentPage]:
    """Runs document parsing asynchronously in a worker thread to keep event loop free."""
    return await asyncio.to_thread(extract_document_pages, file_path, file_type)

