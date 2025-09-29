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

class ChatResponseOut(BaseModel):
    reply: str
    used_faq: bool = False
    run_id: str | None = None

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
    primary_color: Optional[str] = None
    avatar_url: Optional[str] = None
    bot_name: Optional[str] = None
    widget_icon: Optional[str] = None
    widget_position: Optional[str] = None
    input_placeholder: Optional[str] = None
    subheading: Optional[str] = None
    show_branding: Optional[bool] = None
    open_by_default: Optional[bool] = None
    starter_questions: Optional[bool] = None

class WidgetConfigIn(BaseModel):
    form_enabled: Optional[bool] = None
    fields: Optional[List[FormField]] = None
    primary_color: Optional[str] = None
    avatar_url: Optional[str] = None
    bot_name: Optional[str] = None
    widget_icon: Optional[str] = None
    widget_position: Optional[str] = None
    input_placeholder: Optional[str] = None
    subheading: Optional[str] = None
    show_branding: Optional[bool] = None
    open_by_default: Optional[bool] = None
    starter_questions: Optional[bool] = None

class BotConfigOut(BaseModel):
    bot_name: str

class BotConfigIn(BaseModel):
    bot_name: str

class MessagingConfigOut(BaseModel):
    ai_model: Optional[str] = None
    conversational: Optional[bool] = None
    strict_faq: Optional[bool] = None
    response_length: Optional[str] = None
    suggest_followups: Optional[bool] = None
    allow_images: Optional[bool] = None
    show_sources: Optional[bool] = None
    post_feedback: Optional[bool] = None
    multilingual: Optional[bool] = None
    show_welcome: Optional[bool] = None
    welcome_message: Optional[str] = None
    no_source_message: Optional[str] = None
    server_error_message: Optional[str] = None

class MessagingConfigIn(BaseModel):
    ai_model: Optional[str] = None
    conversational: Optional[bool] = None
    strict_faq: Optional[bool] = None
    response_length: Optional[str] = None
    suggest_followups: Optional[bool] = None
    allow_images: Optional[bool] = None
    show_sources: Optional[bool] = None
    post_feedback: Optional[bool] = None
    multilingual: Optional[bool] = None
    show_welcome: Optional[bool] = None
    welcome_message: Optional[str] = None
    no_source_message: Optional[str] = None
    server_error_message: Optional[str] = None

class StarterQuestionsOut(BaseModel):
    questions: List[str] = []
    enabled: Optional[bool] = None

class StarterQuestionsIn(BaseModel):
    questions: List[str] = []
    enabled: Optional[bool] = None

# Inbox schemas
class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str

class ChatOut(BaseModel):
    id: int
    title: str
    preview: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str
    last_message_at: str
    message_count: int

class ChatDetailOut(BaseModel):
    id: int
    title: str
    user_info: Dict[str, Any]
    messages: List[ChatMessageOut]
    created_at: str
    last_message_at: str

class UserOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    ip_address: Optional[str] = None
    last_activity: str
    chat_count: int
    created_at: str

class UserDetailOut(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: str
    last_activity: str
    chat_count: int
    sessions: List[Dict[str, Any]]

# Login schemas
class LoginIn(BaseModel):
    username: str
    password: str

class LoginOut(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None