from pydantic import BaseModel, Field
from typing import List,Optional,Any,Dict

class StartSessionIn(BaseModel):
    assistant_id: int
    user_id: int
    metadata: Optional[Dict[str, Any]] =None
    
class StartSessionOut(BaseModel):
    session_id: int
    
class ChatIn(BaseModel):
    assistant_id: int
    session_id: int
    message: str

class ChatOut(BaseModel):
    reply: str
    used_faq: bool = False
    run_id: str | None = None

class FAQIn(BaseModel):
    assistant_id: int
    question: str
    answer: str


class FAQOut(BaseModel):
    id: int
    assistant_id: int
    question: str
    answer: str


class PromptIn(BaseModel):
    assistant_id: int
    name: str
    text: str
    is_default: bool = False

class PromptOut(BaseModel):
    id: int
    assistant_id: int
    name: str
    text: str
    is_default: bool

class UploadKBOut(BaseModel):
    openai_file_id: str
    filename: str

class WidgetConfigOut(BaseModel):
    theme: str = "light"
    position: str = "bottom-right"
    assistant_id: int