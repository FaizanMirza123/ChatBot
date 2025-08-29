from pydantic import BaseModel
from typing import Optional, Any, Dict

class StartSessionIn(BaseModel):
    user_id: int
    session_metadata: Optional[Dict[str, Any]] = None

class StartSessionOut(BaseModel):
    session_id: int

class ChatIn(BaseModel):
    session_id: int
    message: str

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

class UploadKBOut(BaseModel):
    file_id: str
    filename: str

class WidgetConfigOut(BaseModel):
    theme: str = "light"
    position: str = "bottom-right"

class SystemPromptIn(BaseModel):
    text: str

class SystemPromptOut(BaseModel):
    text: str
    is_custom: bool
