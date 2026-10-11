import asyncio
import json
import os
from pathlib import Path
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.core.embeddings import embedding_service
from app.core.llm import get_llm_client
from app.core.rag_chain import execute_rag_chain
from app.core.retriever import retrieve_relevant_chunks
from app.db.database import AsyncSessionLocal
from app.db.models import Chunk, Document, User


BENCHMARK_PAGES = [
    (1, "Refund and Cancellation Policy. Section 1: Physical Goods. Customers are eligible for a full refund within 30 days of purchase upon presentation of receipt. All physical merchandise must be returned in original condition."),
    (2, "Section 2: Digital Goods and Subscriptions. Subscription renewals are non-refundable after 48 hours from the billing cycle execution date. Automated cancellations apply to subsequent cycles."),
    (3, "Section 3: Disputed Transactions and Chargebacks. Initiating a dispute or chargeback suspends the account immediately until verification is completed with the issuing financial institution."),
    (4, "Section 4: SOC2 Compliance and Data Retention. Audit trails and system access logs must be retained securely for a minimum of 7 years across all production environments."),
]


def calculate_jaccard_similarity(pred: str, expected: str) -> float:
    """Computes word-level Jaccard similarity between generated and expected answer."""
    def tokenize(text: str) -> set:
        clean = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
        return set(word for word in clean.split() if len(word) > 2)

    pred_tokens = tokenize(pred)
    exp_tokens = tokenize(expected)

    if not pred_tokens or not exp_tokens:
        return 0.0

    intersection = pred_tokens.intersection(exp_tokens)
    union = pred_tokens.union(exp_tokens)
    return len(intersection) / len(union) if union else 0.0


async def ensure_benchmark_document(db, user: User) -> Document:
    stmt = select(Document).where(Document.file_name == "benchmark_policy.txt", Document.user_id == user.id)
    doc = (await db.execute(stmt)).scalar_one_or_none()
    if doc:
        return doc

    doc = Document(
        user_id=user.id,
        file_name="benchmark_policy.txt",
        file_path="/dummy/benchmark_policy.txt",
        file_size=len("".join(p[1] for p in BENCHMARK_PAGES)),
        file_type="txt",
        page_count=4,
        status="ready",
        summary="Benchmark policy covering refund windows, subscriptions, chargebacks, and audit logs.",
        suggested_questions=[
            "What is the standard refund window?",
            "How are chargebacks handled?",
        ],
    )
    db.add(doc)
    await db.flush()

    texts = [p[1] for p in BENCHMARK_PAGES]
    embeddings = await embedding_service.embed_batch(texts)

    chunks = [
        Chunk(
            document_id=doc.id,
            user_id=user.id,
            content=text,
            page_number=page_num,
            chunk_index=idx,
            embedding=embeddings[idx],
        )
        for idx, (page_num, text) in enumerate(BENCHMARK_PAGES)
    ]
    db.add_all(chunks)
    await db.commit()
    return doc


async def evaluate():
    json_path = Path(__file__).parent / "test_questions.json"
    with open(json_path, "r", encoding="utf-8") as f:
        test_questions = json.load(f)

    print("=" * 65)
    print("           RAG PIPELINE BENCHMARK EVALUATION")
    print("=" * 65)

    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).limit(1))
        user = user_res.scalar_one_or_none()
        if not user:
            print("No user found. Please run scripts/seed.py first.")
            return

        doc = await ensure_benchmark_document(db, user)
        llm = get_llm_client()
        hits = 0
        total = len(test_questions)
        total_similarity = 0.0

        for item in test_questions:
            q = item["question"]
            exp = item["expected_answer"]
            exp_page = item["source_page"]

            chunks, sources = await retrieve_relevant_chunks(
                db=db,
                user_id=user.id,
                question=q,
                document_ids=[doc.id],
                top_k=2,
                similarity_threshold=0.15,
            )

            retrieved_pages = [s.page for s in sources]
            hit = exp_page in retrieved_pages
            if hit:
                hits += 1

            ans = await execute_rag_chain(q, chunks, llm)
            sim = calculate_jaccard_similarity(ans, exp)
            total_similarity += sim

            print(f"\nQuestion: {q}")
            print(f"Target Page: {exp_page} | Retrieved Pages: {retrieved_pages} | Hit: {'✓' if hit else '✗'}")
            print(f"Generated Answer: {ans}")
            print(f"Similarity Score: {sim:.2f}")

        hit_rate = (hits / total) * 100 if total > 0 else 0
        avg_sim = (total_similarity / total) * 100 if total > 0 else 0

        print("\n" + "=" * 65)
        print(f"Total Evaluated Questions: {total}")
        print(f"Retrieval Hit Rate:        {hit_rate:.1f}%")
        print(f"Average Answer Similarity: {avg_sim:.1f}%")
        print("=" * 65)


if __name__ == "__main__":
    asyncio.run(evaluate())
