from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    external_user_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)

    sessions = relationship("Session", back_populates="user")

from datetime import datetime

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="open")
    session_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session")

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # "user" / "assistant" / "system"
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="messages")

class FAQ(Base):
    __tablename__ = "faqs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Prompt(Base):
    __tablename__ = "prompts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    text: Mapped[str] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

class Form(Base):
    __tablename__ = "forms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fields_schema: Mapped[dict] = mapped_column(JSON)

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    document_type: Mapped[str] = mapped_column(String(50))  # pdf, txt, docx, etc.
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"), index=True)
    chunk_text: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(Integer)  # Order of chunk in document
    vector_id: Mapped[str] = mapped_column(String(255))  # ID in vector database

class DocumentVisibility(Base):
    __tablename__ = "document_visibility"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="CASCADE"), index=True, unique=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class FormResponse(Base):
    __tablename__ = "form_responses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    client_id: Mapped[str | None] = mapped_column(String(128), index=True, nullable=True)
    response_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    client_id: Mapped[str] = mapped_column(String(128), index=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class WidgetConfig(Base):
    __tablename__ = "widget_config"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Single row table (id=1) for global widget settings for now
    form_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    form_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # list of field definitions
    # Theme primary color (hex or CSS color). Note: adding columns in existing DBs may require a migration.
    primary_color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Bot avatar image URL (served from /static/avatars or external URL)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Bot name displayed in the widget
    bot_name: Mapped[str | None] = mapped_column(String(100), nullable=True, default="ChatBot")
    # Appearance settings
    widget_icon: Mapped[str | None] = mapped_column(String(10), nullable=True, default="💬")
    widget_position: Mapped[str | None] = mapped_column(String(10), nullable=True, default="right")
    input_placeholder: Mapped[str | None] = mapped_column(String(100), nullable=True, default="Type your message...")
    subheading: Mapped[str | None] = mapped_column(String(200), nullable=True)
    show_branding: Mapped[bool] = mapped_column(Boolean, default=True)
    open_by_default: Mapped[bool] = mapped_column(Boolean, default=False)
    starter_questions: Mapped[bool] = mapped_column(Boolean, default=True)

class MessagingConfig(Base):
    __tablename__ = "messaging_config"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # AI Model settings
    ai_model: Mapped[str | None] = mapped_column(String(50), nullable=True, default="gpt-4o")
    # Response behavior settings
    conversational: Mapped[bool] = mapped_column(Boolean, default=True)
    strict_faq: Mapped[bool] = mapped_column(Boolean, default=True)
    response_length: Mapped[str | None] = mapped_column(String(20), nullable=True, default="Medium")
    suggest_followups: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_images: Mapped[bool] = mapped_column(Boolean, default=False)
    show_sources: Mapped[bool] = mapped_column(Boolean, default=True)
    post_feedback: Mapped[bool] = mapped_column(Boolean, default=True)
    multilingual: Mapped[bool] = mapped_column(Boolean, default=True)
    # Message settings
    show_welcome: Mapped[bool] = mapped_column(Boolean, default=True)
    welcome_message: Mapped[str | None] = mapped_column(String(500), nullable=True, default="Hey there, how can I help you?")
    no_source_message: Mapped[str | None] = mapped_column(String(500), nullable=True, default="The bot is yet to be trained, please add the data and train the bot.")
    server_error_message: Mapped[str | None] = mapped_column(String(500), nullable=True, default="Apologies, there seems to be a server error.")

class StarterQuestions(Base):
    __tablename__ = "starter_questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Single row table (id=1) for global starter questions
    question_1: Mapped[str | None] = mapped_column(String(200), nullable=True)
    question_2: Mapped[str | None] = mapped_column(String(200), nullable=True)
    question_3: Mapped[str | None] = mapped_column(String(200), nullable=True)
    question_4: Mapped[str | None] = mapped_column(String(200), nullable=True)
    enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=True)
