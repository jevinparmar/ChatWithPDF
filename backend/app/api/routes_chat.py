import json
from typing import Annotated, AsyncIterator, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import get_current_user, get_db
from app.core.action_runner import execute_mode_action_stream
from app.core.llm import clean_inline_sources, get_llm_client
from app.core.rag_chain import (
    execute_rag_flow,
    plan_rag_response,
    rewrite_followup_question,
    stream_rag_flow,
)
from app.core.retriever import retrieve_relevant_chunks
from app.db.database import AsyncSessionLocal
from app.db.models import ChatSession, Message, User
from app.schemas.chat import (
    ChatActionRequest,
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionRename,
    ChatSessionResponse,
    FeedbackRequest,
    FeedbackResponse,
    SourceItem,
)
from app.services.chat_service import (
    create_chat_session,
    delete_chat_session,
    get_session_by_id,
    get_session_messages,
    get_user_sessions,
    record_feedback,
    rename_chat_session,
    save_chat_turn,
)
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["Chat"])
limiter = Limiter(key_func=get_remote_address)


def serialize_session(session: ChatSession) -> ChatSessionResponse:
    doc_ids = [str(d.id) for d in session.documents] if session.documents else []
    return ChatSessionResponse(
        id=str(session.id),
        title=session.title,
        mode=session.mode or "student",
        documentIds=doc_ids,
        createdAt=session.created_at.isoformat() if session.created_at else "",
        updatedAt=session.updated_at.isoformat() if session.updated_at else "",
    )


def serialize_message(msg: Message) -> ChatMessageResponse:
    feedback_val = None
    try:
        fb_list = getattr(msg, "feedback", None)
        if fb_list and len(fb_list) > 0:
            feedback_val = fb_list[0].rating
    except Exception:
        feedback_val = None

    raw_sources = msg.sources or []
    source_items = [
        SourceItem(
            documentId=s.get("documentId", ""),
            fileName=s.get("fileName", ""),
            page=s.get("page", 1),
            snippet=s.get("snippet", ""),
        )
        for s in raw_sources
    ]

    return ChatMessageResponse(
        id=str(msg.id),
        role=msg.role,
        content=msg.content,
        sources=source_items,
        feedback=feedback_val,
        createdAt=msg.created_at.isoformat() if msg.created_at else "",
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[ChatSessionResponse]:
    """Retrieves all chat sessions for authenticated user."""
    sessions = await get_user_sessions(db, current_user.id)
    return [serialize_session(s) for s in sessions]


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: ChatSessionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatSessionResponse:
    """Creates a new conversation session."""
    doc_uuids = [uuid.UUID(d) for d in data.documentIds] if data.documentIds else None
    session_mode = data.mode or current_user.mode or "student"
    session = await create_chat_session(
        db, current_user.id, data.title, mode=session_mode, document_ids=doc_uuids
    )
    return serialize_session(session)


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def rename_session(
    session_id: uuid.UUID,
    data: ChatSessionRename,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatSessionResponse:
    """Renames or updates mode for an existing chat session."""
    session = await rename_chat_session(
        db, current_user.id, session_id, title=data.title, mode=data.mode
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return serialize_session(session)


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deletes a chat session."""
    success = await delete_chat_session(db, current_user.id, session_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return {"success": True}


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> List[ChatMessageResponse]:
    """Retrieves chronological messages for session."""
    messages = await get_session_messages(db, current_user.id, session_id)
    return [serialize_message(m) for m in messages]


@router.post("", response_model=ChatResponse)
@limiter.limit("20/minute")
async def send_message(
    request: Request,
    data: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatResponse:
    """Non-streaming RAG question answering."""
    try:
        session_uuid = uuid.UUID(data.sessionId)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID")

    session = await get_session_by_id(db, current_user.id, session_uuid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    history = await get_session_messages(db, current_user.id, session_uuid)
    llm = get_llm_client(data.model)

    standalone_question = await rewrite_followup_question(data.question, history, llm)

    target_docs = [uuid.UUID(d) for d in data.documentIds] if data.documentIds else []

    plan = await plan_rag_response(
        db=db,
        user_id=current_user.id,
        question=standalone_question,
        document_ids=target_docs,
        llm=llm,
        mode=session.mode or "student",
        top_k=data.topK,
        hybrid_search=data.hybridSearch,
    )

    answer = await execute_rag_flow(plan, llm)
    sources = plan.sources

    user_msg, assistant_msg = await save_chat_turn(
        db=db,
        session_id=session_uuid,
        question=data.question,
        answer=answer,
        sources=sources,
    )

    return ChatResponse(
        messageId=str(assistant_msg.id),
        answer=answer,
        sources=sources,
        userMessage=serialize_message(user_msg),
        assistantMessage=serialize_message(assistant_msg),
    )


@router.post("/stream")
@limiter.limit("20/minute")
async def stream_message(
    request: Request,
    data: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Server-Sent Events streaming RAG response supporting all 3 answer modes."""
    try:
        session_uuid = uuid.UUID(data.sessionId)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID")

    session = await get_session_by_id(db, current_user.id, session_uuid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    history = await get_session_messages(db, current_user.id, session_uuid)
    llm = get_llm_client(data.model)
    standalone_question = await rewrite_followup_question(data.question, history, llm)

    target_docs = [uuid.UUID(d) for d in data.documentIds] if data.documentIds else []

    plan = await plan_rag_response(
        db=db,
        user_id=current_user.id,
        question=standalone_question,
        document_ids=target_docs,
        llm=llm,
        mode=session.mode or "student",
        top_k=data.topK,
        hybrid_search=data.hybridSearch,
    )
    sources = plan.sources

    async def event_generator() -> AsyncIterator[str]:
        accumulated_answer = ""
        try:
            # 1. Yield sources event
            sources_json = json.dumps([s.model_dump() for s in sources])
            yield f"event: sources\ndata: {sources_json}\n\n"

            # 2. Stream tokens
            async for token in stream_rag_flow(plan, llm):
                if await request.is_disconnected():
                    logger.info("Client disconnected during stream")
                    break
                accumulated_answer += token
                token_payload = json.dumps({"text": token, "token": token})
                yield f"event: token\ndata: {token_payload}\n\n"

            # 3. Clean and save completed message
            clean_answer = clean_inline_sources(accumulated_answer)
            _, assistant_msg = await save_chat_turn(
                db=db,
                session_id=session_uuid,
                question=data.question,
                answer=clean_answer,
                sources=sources,
            )
            done_payload = json.dumps({
                "messageId": str(assistant_msg.id),
                "assistantMessage": serialize_message(assistant_msg).model_dump(),
            })
            yield f"event: done\ndata: {done_payload}\n\n"

        except Exception as e:
            logger.exception(f"Error in SSE stream: {e}")
            err_payload = json.dumps({"message": str(e)})
            yield f"event: error\ndata: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/action")
@limiter.limit("20/minute")
async def run_chat_action(
    request: Request,
    data: ChatActionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Executes a mode quick action and streams progress/result via SSE."""
    try:
        session_uuid = uuid.UUID(data.sessionId)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID")

    session = await get_session_by_id(db, current_user.id, session_uuid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    target_docs = [uuid.UUID(d) for d in data.documentIds] if data.documentIds else None
    if not target_docs and session.documents:
        target_docs = [d.id for d in session.documents]

    async def event_generator() -> AsyncIterator[str]:
        try:
            llm = get_llm_client(data.model)
            async for chunk in execute_mode_action_stream(
                db=db,
                user_id=current_user.id,
                session=session,
                action_id=data.actionId,
                document_ids=target_docs or [],
                options=data.options or {},
                llm=llm,
            ):
                if await request.is_disconnected():
                    logger.info("Client disconnected during action execution")
                    break
                evt = chunk.get("event", "message")
                payload = json.dumps(chunk.get("data", {}))
                yield f"event: {evt}\ndata: {payload}\n\n"
        except Exception as e:
            logger.exception(f"Error in mode action execution: {e}")
            err_payload = json.dumps({"error": str(e), "message": str(e)})
            yield f"event: error\ndata: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    data: FeedbackRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FeedbackResponse:
    """Records thumbs up/down user feedback on an assistant message."""
    try:
        msg_uuid = uuid.UUID(data.messageId)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid message ID")

    success = await record_feedback(
        db=db,
        user_id=current_user.id,
        message_id=msg_uuid,
        rating=data.rating,
        comment=data.comment,
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return FeedbackResponse(success=True, message="Feedback submitted")
