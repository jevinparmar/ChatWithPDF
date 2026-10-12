import asyncio
import os
import shutil
import sys
import uuid

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.config import settings
from app.core.embeddings import embedding_service
from app.core.security import get_password_hash
from app.core.splitter import split_document_pages
from app.db.database import AsyncSessionLocal, init_db_extensions
from app.db.models import ChatSession, Chunk, Document, User, session_documents
from app.services.document_service import extract_document_pages_async

SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tests", "samples"))

SAMPLE_SPECS = [
    {
        "filename": "sample_notes.pdf",
        "file_type": "pdf",
        "role": "notes",
        "location_type": "page",
    },
    {
        "filename": "sample_presentation.pptx",
        "file_type": "pptx",
        "role": "notes",
        "location_type": "slide",
    },
    {
        "filename": "sample_contract.docx",
        "file_type": "docx",
        "role": "contract",
        "location_type": "section",
    },
    {
        "filename": "sample_resume.pdf",
        "file_type": "pdf",
        "role": "resume",
        "location_type": "page",
    },
    {
        "filename": "sample_job_description.docx",
        "file_type": "docx",
        "role": "job_description",
        "location_type": "section",
    },
]


async def seed_demo():
    print("Initializing DB extensions...")
    await init_db_extensions()
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async with AsyncSessionLocal() as db:
        # 1. Demo User
        demo_email = "demo@chatwithpdf.com"
        stmt = select(User).where(User.email == demo_email)
        user = (await db.execute(stmt)).scalar_one_or_none()

        if not user:
            user = User(
                name="Demo Explorer",
                email=demo_email,
                password_hash=get_password_hash("password123"),
                role="user",
                mode="student",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"Created demo user: {demo_email} (password: password123)")
        else:
            print(f"Using existing demo user: {demo_email}")

        # 2. Ingest Sample Documents
        doc_map = {}
        for spec in SAMPLE_SPECS:
            src_path = os.path.join(SAMPLES_DIR, spec["filename"])
            if not os.path.exists(src_path):
                print(f"Warning: sample file {src_path} not found. Skipping.")
                continue

            # Check if already ingested for demo user
            d_stmt = select(Document).where(Document.user_id == user.id, Document.file_name == spec["filename"])
            existing_doc = (await db.execute(d_stmt)).scalar_one_or_none()

            if existing_doc:
                doc_map[spec["filename"]] = existing_doc
                print(f"Document already indexed: {spec['filename']}")
                continue

            # Copy to upload directory
            dest_filename = f"{uuid.uuid4()}_{spec['filename']}"
            dest_path = settings.UPLOAD_DIR / dest_filename
            shutil.copyfile(src_path, dest_path)
            file_size = os.path.getsize(dest_path)

            print(f"Parsing and chunking: {spec['filename']}...")
            cleaned_pages = await extract_document_pages_async(dest_path, spec["file_type"])
            chunk_data_list = split_document_pages(cleaned_pages, chunk_size=512, chunk_overlap=50)
            detected_loc_type = cleaned_pages[0].location_type if cleaned_pages else "page"

            doc = Document(
                user_id=user.id,
                file_name=spec["filename"],
                file_path=str(dest_path),
                file_size=file_size,
                file_type=spec["file_type"],
                location_type=spec.get("location_type", detected_loc_type),
                role=spec["role"],
                page_count=len(cleaned_pages),
                status="ready",
            )
            db.add(doc)
            await db.flush()

            # Embed chunks
            if chunk_data_list:
                texts = [c.content for c in chunk_data_list]
                embeddings = await embedding_service.embed_batch(texts)
                for c_data, emb in zip(chunk_data_list, embeddings):
                    chunk = Chunk(
                        document_id=doc.id,
                        user_id=user.id,
                        page_number=c_data.page_number,
                        chunk_index=c_data.chunk_index,
                        content=c_data.content,
                        location_type=c_data.location_type,
                        location_label=c_data.location_label,
                        embedding=emb,
                    )
                    db.add(chunk)

            await db.commit()
            await db.refresh(doc)
            doc_map[spec["filename"]] = doc
            print(f"Successfully indexed {spec['filename']} ({len(chunk_data_list)} chunks)")

        # 3. Create Demo Sessions for Every Mode
        mode_sessions = [
            {
                "title": "🎓 Student Mode: Distributed Systems Exam Prep",
                "mode": "student",
                "docs": ["sample_notes.pdf"],
            },
            {
                "title": "🔬 Researcher Mode: Cloud Platform Paper Synthesis",
                "mode": "researcher",
                "docs": ["sample_notes.pdf", "sample_presentation.pptx"],
            },
            {
                "title": "💼 Business Mode: Enterprise Architecture & SLA Review",
                "mode": "business",
                "docs": ["sample_presentation.pptx"],
            },
            {
                "title": "⚖️ Legal Mode: Master Services Agreement Audit",
                "mode": "legal",
                "docs": ["sample_contract.docx"],
            },
            {
                "title": "🚀 Career Mode: Cloud Engineer Match & Bullet Rewrites",
                "mode": "career",
                "docs": ["sample_resume.pdf", "sample_job_description.docx"],
            },
        ]

        for s_spec in mode_sessions:
            # Check if session exists
            sess_stmt = select(ChatSession).where(ChatSession.user_id == user.id, ChatSession.title == s_spec["title"])
            existing_sess = (await db.execute(sess_stmt)).scalar_one_or_none()

            if not existing_sess:
                new_session = ChatSession(
                    user_id=user.id,
                    title=s_spec["title"],
                    mode=s_spec["mode"],
                )
                db.add(new_session)
                await db.flush()

                # Associate documents
                for fname in s_spec["docs"]:
                    if fname in doc_map:
                        await db.execute(
                            session_documents.insert().values(
                                session_id=new_session.id,
                                document_id=doc_map[fname].id,
                            )
                        )

                await db.commit()
                print(f"Created demo session: '{s_spec['title']}' [{s_spec['mode']}]")

        print("\nAll demo modes and documents seeded successfully!")
        print(f"Credentials:\n  Email:    {demo_email}\n  Password: password123")


if __name__ == "__main__":
    asyncio.run(seed_demo())
