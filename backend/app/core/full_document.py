import asyncio
from collections import defaultdict
import hashlib
import json
from typing import AsyncIterator, Callable, List, Optional, Tuple, Union
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import BaseLLMClient, clean_inline_sources, get_llm_client
from app.core.prompts import (
    MAP_REDUCE_COMBINE_PROMPT,
    MAP_REDUCE_SECTION_PROMPT,
    TEACHER_SYSTEM_PROMPT,
)
from app.core.retriever import RetrievedChunk, load_all_document_chunks
from app.db.models import GeneratedOutput
from app.schemas.chat import SourceItem
from app.utils.logger import logger


def compute_document_ids_hash(document_ids: List[uuid.UUID]) -> str:
    """Computes a deterministic SHA256 hash for a list of document IDs."""
    sorted_ids = sorted([str(d) for d in document_ids])
    joined = ",".join(sorted_ids)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


async def get_cached_output(
    db: AsyncSession,
    user_id: uuid.UUID,
    doc_hash: str,
    mode: str,
    action: str,
    options: dict,
) -> Optional[Union[str, dict]]:
    """Checks generated_outputs table for a previously computed output with matching options."""
    stmt = (
        select(GeneratedOutput)
        .where(
            GeneratedOutput.user_id == user_id,
            GeneratedOutput.document_ids_hash == doc_hash,
            GeneratedOutput.mode == mode,
            GeneratedOutput.action == action,
        )
        .order_by(GeneratedOutput.created_at.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    for rec in records:
        if (rec.options or {}) == (options or {}):
            try:
                # Try parsing as JSON if it's structured
                return json.loads(rec.content)
            except Exception:
                return rec.content
    return None


async def save_cached_output(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_ids: List[uuid.UUID],
    doc_hash: str,
    mode: str,
    action: str,
    options: dict,
    content: Union[str, dict],
) -> None:
    """Saves generated result to generated_outputs table."""
    try:
        content_str = json.dumps(content) if isinstance(content, (dict, list)) else str(content)
        doc_ids_list = [str(d) for d in document_ids]

        # Check existing to update or insert new
        stmt = (
            select(GeneratedOutput)
            .where(
                GeneratedOutput.user_id == user_id,
                GeneratedOutput.document_ids_hash == doc_hash,
                GeneratedOutput.mode == mode,
                GeneratedOutput.action == action,
            )
        )
        res = await db.execute(stmt)
        existing = res.scalars().all()
        for rec in existing:
            if (rec.options or {}) == (options or {}):
                rec.content = content_str
                rec.document_ids = doc_ids_list
                await db.commit()
                return

        new_record = GeneratedOutput(
            user_id=user_id,
            document_ids_hash=doc_hash,
            mode=mode,
            action=action,
            options=options or {},
            content=content_str,
            document_ids=doc_ids_list,
        )
        db.add(new_record)
        await db.commit()
    except Exception as e:
        logger.warning(f"Failed to cache generated output: {e}")


def rebuild_full_text_with_locations(
    all_chunks: List[RetrievedChunk],
) -> Tuple[str, List[dict], List[SourceItem]]:
    """
    Rebuilds complete text ordered by document and location markers.
    Returns:
    - full_text: string with location headers
    - unit_blocks: list of unit blocks for map-reduce
    - sources: list of SourceItem chips
    """
    # Group chunks by (file_name, location_label, page_number)
    unit_map: dict[tuple[str, str, int, str], list[str]] = defaultdict(list)
    doc_id_map: dict[str, str] = {}

    for c in all_chunks:
        loc_label = c.location_label or f"Page {c.page_number}"
        unit_map[(c.document_id, c.file_name, c.page_number, loc_label)].append(c.content)
        doc_id_map[c.file_name] = c.document_id

    # Sort units by (doc_id, page_number)
    sorted_units = sorted(unit_map.keys(), key=lambda k: (k[0], k[2]))

    full_blocks = []
    unit_blocks = []
    sources: List[SourceItem] = []
    seen_sources = set()

    for doc_id, file_name, page_num, loc_label in sorted_units:
        parts = unit_map[(doc_id, file_name, page_num, loc_label)]
        block_text = "\n".join(parts)
        header = f"[{file_name} - {loc_label}]"
        full_blocks.append(f"{header}\n{block_text}")
        unit_blocks.append({
            "document_id": doc_id,
            "file_name": file_name,
            "page_number": page_num,
            "label": loc_label,
            "text": block_text,
        })

        source_key = (doc_id, page_num)
        if source_key not in seen_sources and len(sources) < 12:
            seen_sources.add(source_key)
            snippet = block_text[:200].replace("\n", " ").strip()
            if len(block_text) > 200:
                snippet += "..."
            loc_type = "slide" if "slide" in loc_label.lower() else "sheet" if "sheet" in loc_label.lower() else "section" if "section" in loc_label.lower() else "page"
            sources.append(
                SourceItem(
                    documentId=doc_id,
                    fileName=file_name,
                    page=page_num,
                    locationType=loc_type,
                    locationLabel=loc_label,
                    snippet=snippet,
                )
            )

    full_text = "\n\n".join(full_blocks)
    return full_text, unit_blocks, sources


async def execute_full_document_engine(
    db: AsyncSession,
    user_id: uuid.UUID,
    document_ids: List[uuid.UUID],
    mode: str,
    action: str,
    options: dict,
    system_prompt: str,
    user_instruction: str,
    llm: Optional[BaseLLMClient] = None,
    progress_callback: Optional[Callable[[dict], asyncio.Future]] = None,
) -> Tuple[Union[str, dict], List[SourceItem], bool]:
    """
    Full-document understanding engine:
    1. Checks cache in generated_outputs.
    2. Rebuilds ordered text with location markers.
    3. If <= ~80k tokens (chars / 4), executes single-pass LLM.
    4. If > 80k tokens, executes map-reduce with progress updates.
    5. Caches output in generated_outputs table.
    Returns (result, sources, was_cached).
    """
    if llm is None:
        llm = get_llm_client()

    doc_hash = compute_document_ids_hash(document_ids)

    # 1. Check Cache
    cached = await get_cached_output(db, user_id, doc_hash, mode, action, options)
    if cached is not None:
        logger.info(f"Cache hit in generated_outputs for action='{action}', mode='{mode}'")
        # Load sources for chips
        all_chunks = await load_all_document_chunks(db, user_id, document_ids)
        _, _, sources = rebuild_full_text_with_locations(all_chunks)
        return cached, sources, True

    # 2. Load chunks and rebuild full text
    all_chunks = await load_all_document_chunks(db, user_id, document_ids)
    if not all_chunks:
        return "No text could be extracted from the selected document(s).", [], False

    full_text, unit_blocks, sources = rebuild_full_text_with_locations(all_chunks)
    estimated_tokens = len(full_text) // 4
    total_units = len(unit_blocks)

    # 3. Fits in ~80,000 tokens: Single Pass
    if estimated_tokens <= 80000:
        if progress_callback:
            await progress_callback({"step": f"Reading {total_units} document section(s)..."})

        prompt = (
            f"Full Document Content:\n\n{full_text}\n\n"
            f"Task Instruction:\n{user_instruction}"
        )

        response = await llm.generate(
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=4000,
            temperature=0.1,
        )
        cleaned = clean_inline_sources(response)

        # Cache output
        await save_cached_output(db, user_id, document_ids, doc_hash, mode, action, options, cleaned)
        return cleaned, sources, False

    # 4. Larger than 80,000 tokens: Map-Reduce
    logger.info(f"Full-document engine executing map-reduce ({estimated_tokens} estimated tokens, {total_units} units)")
    units_per_group = 10
    group_summaries = []

    for i in range(0, total_units, units_per_group):
        group = unit_blocks[i : i + units_per_group]
        start_unit = i + 1
        end_unit = min(i + units_per_group, total_units)
        first_label = group[0]["label"]
        last_label = group[-1]["label"]

        progress_msg = f"Reading {first_label} to {last_label} ({start_unit}-{end_unit} of {total_units})"
        if progress_callback:
            await progress_callback({"step": progress_msg})

        group_text = "\n\n".join(f"[{g['file_name']} - {g['label']}]\n{g['text']}" for g in group)
        sec_prompt = (
            f"Document Content ({first_label} to {last_label}):\n\n{group_text}\n\n"
            f"Summarize the key topics, concepts, facts, figures, and takeaways:"
        )

        sec_summary = await llm.generate(
            system=MAP_REDUCE_SECTION_PROMPT,
            messages=[{"role": "user", "content": sec_prompt}],
            max_tokens=1000,
            temperature=0.1,
        )
        group_summaries.append(f"### {first_label} – {last_label}\n{clean_inline_sources(sec_summary)}")

    if progress_callback:
        await progress_callback({"step": f"Synthesizing all {len(group_summaries)} sections into master response..."})

    combined_sections = "\n\n".join(group_summaries)
    master_prompt = (
        f"Master Section Summaries:\n\n{combined_sections}\n\n"
        f"Task Instruction:\n{user_instruction}"
    )

    final_response = await llm.generate(
        system=system_prompt,
        messages=[{"role": "user", "content": master_prompt}],
        max_tokens=4000,
        temperature=0.1,
    )
    cleaned = clean_inline_sources(final_response)

    # Cache output
    await save_cached_output(db, user_id, document_ids, doc_hash, mode, action, options, cleaned)
    return cleaned, sources, False
