import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.db.database import Base

# Association table for session documents (Many-to-Many)
session_documents = Table(
    "session_documents",
    Base.metadata,
    Column(
        "session_id",
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "document_id",
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(Base):
    """User account entity."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)
    mode = Column(String(50), default="student", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")
    generated_outputs = relationship("GeneratedOutput", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    """Document uploaded by user for ingestion and indexing."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_type = Column(String(20), nullable=False)
    location_type = Column(String(50), default="page", nullable=False)  # page | slide | section | sheet
    role = Column(String(50), nullable=True)  # resume | job_description | contract | paper | notes | other
    page_count = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="processing", nullable=False)  # processing, ready, failed
    error_message = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    suggested_questions = Column(JSONB, nullable=True, default=list)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    sessions = relationship("ChatSession", secondary=session_documents, back_populates="documents")


class Chunk(Base):
    """Document text chunk with vector embedding."""

    __tablename__ = "chunks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    chunk_index = Column(Integer, nullable=False, default=0)
    location_type = Column(String(50), default="page", nullable=False)  # page | slide | section | sheet
    location_label = Column(String(255), nullable=True)  # Page 4 | Slide 7 | Section: Introduction | Sheet: Sales
    embedding = Column(Vector(384), nullable=False)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index(
            "idx_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("idx_chunks_user_doc", "user_id", "document_id"),
    )


class ChatSession(Base):
    """Chat session grouped per conversation."""

    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title = Column(String(255), default="New conversation", nullable=False)
    mode = Column(String(50), default="student", nullable=False)  # student | researcher | business | legal | career
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="sessions")
    documents = relationship("Document", secondary=session_documents, back_populates="sessions")
    messages = relationship(
        "Message",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
        lazy="selectin",
    )


class GeneratedOutput(Base):
    """Cached full-file or mode action output to guarantee instant responses on identical queries."""

    __tablename__ = "generated_outputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    document_ids_hash = Column(String(64), nullable=False, index=True)
    mode = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    options = Column(JSONB, default=dict)
    content = Column(Text, nullable=False)
    document_ids = Column(JSONB, default=list)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", back_populates="generated_outputs")

    __table_args__ = (
        Index("idx_generated_outputs_lookup", "user_id", "document_ids_hash", "mode", "action"),
    )


class Message(Base):
    """Chat message in a conversation session."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(JSONB, nullable=True, default=list)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    session = relationship("ChatSession", back_populates="messages")
    feedback = relationship(
        "Feedback",
        back_populates="message",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Feedback(Base):
    """User feedback for assistant message."""

    __tablename__ = "feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    rating = Column(String(10), nullable=False)  # up | down
    comment = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    message = relationship("Message", back_populates="feedback")
    user = relationship("User", back_populates="feedback")


