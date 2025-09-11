from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict, List

class StartSessionIn(BaseModel):
    user_id: int
    session_metadata: Optional[Dict[str, Any]] = None

class StartSessionOut(BaseModel):
    session_id: int

class ChatIn(BaseModel):
    message: str
    client_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChatOut(BaseModel):
    reply: str
    used_faq: bool = False
    run_id: str | None = None

class FAQIn(BaseModel):
    question: str
    answer: str

class FAQOut(BaseModel):
    id: int
    question: str
    answer: str

class PromptIn(BaseModel):
    name: str
    text: str
    is_default: bool = False

class PromptOut(BaseModel):
    id: int
    name: str
    text: str
    is_default: bool

class WidgetConfigOut(BaseModel):
    theme: str = "light"
    position: str = "bottom-right"

class SystemPromptIn(BaseModel):
    text: str

class SystemPromptOut(BaseModel):
    text: str
    is_custom: bool

class DocumentUploadOut(BaseModel):
    id: int
    filename: str
    document_type: str
    upload_date: str
    processed: bool
    chunk_count: int

class DocumentListOut(BaseModel):
    documents: List[DocumentUploadOut]

class DocumentDeleteOut(BaseModel):
    message: str
    success: bool

class LeadIn(BaseModel):
    name: str
    email: EmailStr
    client_id: Optional[str] = None

class LeadOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: str

class FormField(BaseModel):
    name: str  # key used in storage
    label: str
    type: str = "text"  # text, email, number, textarea
    required: bool = False
    placeholder: Optional[str] = None
    order: int = 0

class WidgetConfigOut(BaseModel):
    form_enabled: bool
    fields: List[FormField] = []

class WidgetConfigIn(BaseModel):
    form_enabled: bool
    fields: List[FormField] = []
