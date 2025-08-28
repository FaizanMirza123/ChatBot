from sqlalchemy import( Column, String, Integer, Text, DateTime, ForeignKey, Boolean, JSON)

from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func
from .db import Base

class Assistants(Base):
    __tablename__="Assistants"
    id:Mapped[int]=mapped_column(Integer, primary_key=True)
    name: Mapped[str] =mapped_column(String(120),unique=True,nullable=False)


class User(Base):
    __tablename__="users"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    assistant_id:Mapped[int]=mapped_column(Integer,ForeignKey("assistants.id",ondelete="CASCADE"),nullable=True)
    user_id:Mapped[str]=mapped_column(String(128),index=True,nullable=False)
    
    assistant=relationship("Assistants")
    
class Session(Base):
    __tablename__="Sessions"
    id:Mapped[int]=mapped_column(Integer,primary_key=True)
    assistant_id:Mapped[int]=mapped_column(ForeignKey("assistants.id",ondelete="CASCADE"))
    user_id:Mapped[int | None]=mapped_column(ForeignKey("users.id",ondelete="SET NULL"))
    status: Mapped[str]=mapped_column(String(16),default="open")
    metadata: Mapped[dict | None]=mapped_column(JSON,nullable=True)
    created_at:Mapped[DateTime]=mapped_column(DateTime(timezone=True),server_default=func.now())
    closed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now())


class FAQ(Base):
    __tablename__ = "faqs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey("assistants.id", ondelete="CASCADE"), index=True)
    questionn: Mapped[str] = mapped_column(Text)  
    answer: Mapped[str] = mapped_column(Text)
    created_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now())
    
class Prompt(Base):
    __tablename__ = "prompts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey("assistants.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)


class KBFile(Base):
    __tablename__ = "kb_files"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey("assistants.id", ondelete="CASCADE"), index=True)
    openai_file_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255))

class Form(Base):
    __tablename__ = "forms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey("assistants.id", ondelete="CASCADE"), index=True)
    fields_schema: Mapped[dict] = mapped_column(JSON)  
    
class FormResponse(Base):
    __tablename__ = "form_responses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)
    assistant_id: Mapped[int] = mapped_column(ForeignKey("assistants.id", ondelete="CASCADE"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    response_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped = mapped_column(DateTime(timezone=True), server_default=func.now())
  
    

    
    
                                
    