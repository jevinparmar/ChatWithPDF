from datetime import datetime, timezone
import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ChatSession, Document, Feedback, Message, session_documents
from app.schemas.chat import SourceItem
from app.utils.logger import logger


async def get_user_sessions(db: AsyncSession, user_id: uuid.UUID) -> List[ChatSession]:
    """Retrieves all chat sessions for user, ordered newest first."""
    stmt = (
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .options(selectinload(ChatSession.documents))
        .order_by(ChatSession.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_chat_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: Optional[str] = "New conversation",
    document_ids: Optional[List[uuid.UUID]] = None,
) -> ChatSession:
    """Creates a new chat session linked with selected user documents."""
    session = ChatSession(
        user_id=user_id,
        title=title or "New conversation",
    )
    db.add(session)
    await db.flush()

    if document_ids:
        # Verify user owns the documents
        stmt = select(Document).where(Document.id.in_(document_ids), Document.user_id == user_id)
        valid_docs = (await db.execute(stmt)).scalars().all()
        for doc in valid_docs:
            await db.execute(
                session_documents.insert().values(session_id=session.id, document_id=doc.id)
            )

    await db.commit()
    # Re-query with documents preloaded
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session.id)
        .options(selectinload(ChatSession.documents))
    )
    return result.scalar_one()


async def get_session_by_id(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> Optional[ChatSession]:
    """Fetches single chat session owned by user."""
    stmt = (
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .options(selectinload(ChatSession.documents))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def rename_chat_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    title: str,
) -> Optional[ChatSession]:
    """Renames an existing session."""
    session = await get_session_by_id(db, user_id, session_id)
    if not session:
        return None
    session.title = title.strip()
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


async def delete_chat_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> bool:
    """Deletes a chat session and all messages within it."""
    session = await get_session_by_id(db, user_id, session_id)
    if not session:
        return False
    await db.delete(session)
    await db.commit()
    return True


async def get_session_messages(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
) -> List[Message]:
    """Retrieves all messages for session if owned by user."""
    session = await get_session_by_id(db, user_id, session_id)
    if not session:
        return []

    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
        .options(selectinload(Message.feedback))
        .order_by(Message.created_at.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def save_chat_turn(
    db: AsyncSession,
    session_id: uuid.UUID,
    question: str,
    answer: str,
    sources: List[SourceItem],
) -> Tuple[Message, Message]:
    """Persists user query and assistant response with sources."""
    user_msg = Message(
        session_id=session_id,
        role="user",
        content=question,
    )
    assistant_msg = Message(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources=[s.model_dump() for s in sources],
    )
    db.add(user_msg)
    db.add(assistant_msg)

    # Update session timestamp & auto-name title if initial message
    session_res = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = session_res.scalar_one_or_none()
    if session:
        session.updated_at = datetime.now(timezone.utc)
        if session.title in ("New conversation", "New chat"):
            session.title = question[:32] + ("..." if len(question) > 32 else "")

    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)
    return user_msg, assistant_msg


async def record_feedback(
    db: AsyncSession,
    user_id: uuid.UUID,
    message_id: uuid.UUID,
    rating: str,
    comment: Optional[str] = None,
) -> bool:
    """Submits or updates rating on assistant message."""
    # Ensure message exists and user has access via session
    msg_res = await db.execute(
        select(Message)
        .join(ChatSession, Message.session_id == ChatSession.id)
        .where(Message.id == message_id, ChatSession.user_id == user_id)
    )
    msg = msg_res.scalar_one_or_none()
    if not msg:
        return False

    # Check for existing feedback
    fb_res = await db.execute(
        select(Feedback).where(Feedback.message_id == message_id, Feedback.user_id == user_id)
    )
    existing_fb = fb_res.scalar_one_or_none()

    if existing_fb:
        existing_fb.rating = rating
        existing_fb.comment = comment
    else:
        fb = Feedback(
            message_id=message_id,
            user_id=user_id,
            rating=rating,
            comment=comment,
        )
        db.add(fb)

    await db.commit()
    return True
