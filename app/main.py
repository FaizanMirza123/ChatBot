from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from openai import OpenAI
from config import settings
from db import get_db, Base, engine
from models import Prompt, KnowledgeDocument, Message, User, Session as ChatSession, Lead, WidgetConfig
from schemas import ChatIn, ChatOut, SystemPromptIn, SystemPromptOut, DocumentUploadOut, DocumentListOut, DocumentDeleteOut
from schemas import LeadIn, LeadOut, WidgetConfigOut, WidgetConfigIn
from schemas import FormField
from services.rag_service import RAGService
from utils.token_counter import trim_history_to_token_budget
import os
import shutil
from pathlib import Path

app = FastAPI()
client = OpenAI(api_key=settings.OPENAI_API_KEY)
rag_service = RAGService()
# Create DB tables on startup if they don't exist (safe for SQLite/dev)
@app.on_event("startup")
def _startup_init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        # Avoid crashing if DB user lacks DDL permissions in prod
        pass

# CORS: allow configured origins; if none provided, allow all (no credentials)
origins = settings.cors_origins_parsed or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r".*",  # allow file:// (Origin: null) and any host during dev
    allow_credentials=False if origins == ["*"] else True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Serve static assets (embeddable widget)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Default system prompt (helpful, grounded, and concise)
DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful AI assistant for Dipietro & Associates.\n\n"
    "Answer directly and keep it brief:\n"
    "- Start with the direct answer in 1 sentence when possible.\n"
    "- Use at most 2–3 short sentences, or up to 3 bullets if listing options.\n"
    "- Avoid persona/intros (e.g., 'As an assistant...'). No fluff or repetition.\n"
    "- If using the Knowledge Base (KB), weave facts in naturally and mention it's from the KB when helpful.\n"
    "- For company-specific details (appointments, pricing, policies), don't guess—say what you know or what needs staff confirmation.\n"
)


in_memory_system_prompt = DEFAULT_SYSTEM_PROMPT
use_database = True

# List all form entries (leads) for admin table
@app.get("/form-entries")
async def list_form_entries(db: Session = Depends(get_db)):
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()
    entries = [
        {
            "id": l.id,
            "name": l.name,
            "email": l.email,
            "client_id": l.client_id,
            "created_at": l.created_at.isoformat()
        }
        for l in leads
    ]
    return JSONResponse(content={"entries": entries})

def get_current_system_prompt(db: Session) -> str:
    """Get the current system prompt from database or return default"""
    prompt = db.query(Prompt).filter(Prompt.is_default == True).first()
    if prompt:
        return prompt.text
    return DEFAULT_SYSTEM_PROMPT


def require_admin(x_api_key: str | None = Header(default=None)):
    if settings.ADMIN_API_KEY and x_api_key == settings.ADMIN_API_KEY:
        return True
    if settings.ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # If no ADMIN_API_KEY configured, allow (dev mode)
    return True

# ----- Per-client isolation helpers -----
def _get_or_create_client_session(db: Session, client_id: str) -> ChatSession:
    """Return a per-client session keyed by a stable client_id (from header or body)."""
    # Each unique client_id maps to one User and one open Session
    user = db.query(User).filter(User.external_user_id == client_id).first()
    if not user:
        user = User(external_user_id=client_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    sess = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id, ChatSession.status == "open")
        .order_by(ChatSession.id.desc())
        .first()
    )
    if not sess:
        sess = ChatSession(user_id=user.id, session_metadata={"client_id": client_id})
        db.add(sess)
        db.commit()
        db.refresh(sess)
    return sess

def _get_or_create_user_by_client_id(db: Session, client_id: str) -> User:
    user = db.query(User).filter(User.external_user_id == client_id).first()
    if not user:
        user = User(external_user_id=client_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def _fetch_history_by_token_budget(db: Session, session_id: int) -> list[dict]:
    """Fetch chat history strictly by token budget (no arbitrary message limit).
    We page messages in chunks from newest to oldest until the budget is filled.
    """
    # Hard guard against runaway DB scans; can be tuned
    page_size = 100
    offset = 0
    collected: list[Message] = []

    # Keep pulling pages until adding another page would exceed token budget after trimming
    while True:
        page = (
            db.query(Message)
            .filter(Message.session_id == session_id)
            .order_by(Message.id.desc())
            .offset(offset)
            .limit(page_size)
            .all()
        )
        if not page:
            break

        collected.extend(page)
        # Try trimming with what we have so far; if it already meets budget, we can stop
        test_msgs = [
            {"role": m.role, "content": m.content}
            for m in reversed(collected)
            if m.role in ("user", "assistant")
        ]
        trimmed = trim_history_to_token_budget(
            test_msgs,
            settings.CHAT_HISTORY_MAX_TOKENS,
            settings.OPENAI_MODEL,
        )
        # If trimming didn't grow with this page (i.e., budget reached), stop
        if len(trimmed) < len(test_msgs):
            break
        offset += page_size

    # Final trim on the aggregated set
    final_msgs = [
        {"role": m.role, "content": m.content}
        for m in reversed(collected)
        if m.role in ("user", "assistant")
    ]
    return trim_history_to_token_budget(
        final_msgs, settings.CHAT_HISTORY_MAX_TOKENS, settings.OPENAI_MODEL
    )


@app.get("/messages")
async def get_messages(x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Return recent messages for the caller's isolated session, limited by token budget.
    Uses X-Client-Id header as the isolation key.
    """
    try:
        client_id = x_client_id or "anonymous"
        sess = _get_or_create_client_session(db, client_id)
        trimmed = _fetch_history_by_token_budget(db, sess.id)
        # Return trimmed messages in chronological order
        return {"messages": trimmed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")

# Removed multi-session management endpoints in single-session mode

@app.post("/chat", response_model=ChatOut)
async def chat(chat_data: ChatIn, x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Chat endpoint with token-budgeted message history.
    - Loads recent messages for the session within token limits
    - Persists the new user message and the assistant reply
    - Passes history to the RAG service for context
    """
    try:
        system_prompt = get_current_system_prompt(db)

        # Build OpenAI-formatted history for the caller's isolated session
        client_id = (chat_data.client_id or x_client_id or "anonymous").strip() or "anonymous"
        sess = _get_or_create_client_session(db, client_id)
        raw_history = _fetch_history_by_token_budget(db, sess.id)

        # Add system prompt and trim to token budget
        messages_with_system = [{"role": "system", "content": system_prompt}] + raw_history
        history = trim_history_to_token_budget(
            messages_with_system,
            settings.CHAT_HISTORY_MAX_TOKENS,
            settings.OPENAI_MODEL,
        )

        # Remove system prompt from history (RAG service will add it back)
        history = [msg for msg in history if msg.get("role") != "system"]

        # If name/email provided in this request, upsert lead
        if (chat_data.name and chat_data.name.strip()) or chat_data.email:
            try:
                # Ensure user exists
                _user = _get_or_create_user_by_client_id(db, client_id)
                existing = (
                    db.query(Lead)
                    .filter(Lead.client_id == client_id)
                    .order_by(Lead.id.desc())
                    .first()
                )
                if existing:
                    if chat_data.name and chat_data.name.strip():
                        existing.name = chat_data.name.strip()
                    if chat_data.email:
                        existing.email = str(chat_data.email)
                    db.add(existing)
                    db.commit()
                else:
                    lead = Lead(user_id=_user.id, client_id=client_id, name=(chat_data.name or "").strip(), email=str(chat_data.email) if chat_data.email else "")
                    db.add(lead)
                    db.commit()
            except Exception:
                db.rollback()
                # don't fail the chat on lead save error
                pass

        # Persist the current user message
        user_msg = Message(session_id=sess.id, role="user", content=chat_data.message)
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # Generate response with token-budgeted history
        reply, used_kb = rag_service.generate_rag_response(
            chat_data.message, system_prompt, history=history
        )

        # Persist assistant reply
        assistant_msg = Message(session_id=sess.id, role="assistant", content=reply)
        db.add(assistant_msg)
        db.commit()

        return ChatOut(reply=reply, used_faq=used_kb, run_id="rag-response")

    except Exception as e:
        db.rollback()
        return ChatOut(reply=f"Error: {str(e)}", used_faq=False, run_id=None)

@app.get("/system-prompt", response_model=SystemPromptOut)
async def get_system_prompt(db: Session = Depends(get_db)):
    """Get the current system prompt"""
    prompt = db.query(Prompt).filter(Prompt.is_default == True).first()
    if prompt:
        return SystemPromptOut(text=prompt.text, is_custom=True)
    return SystemPromptOut(text=DEFAULT_SYSTEM_PROMPT, is_custom=False)

@app.get("/lead", response_model=LeadOut | None, status_code=200)
async def get_lead(x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Get saved lead info (name/email) for this client, if any.

    Returns 200 with JSON when a lead exists, otherwise 204 No Content to avoid noisy 404 logs in normal flow.
    """
    client_id = (x_client_id or "anonymous").strip() or "anonymous"
    lead = (
        db.query(Lead)
        .filter(Lead.client_id == client_id)
        .order_by(Lead.id.desc())
        .first()
    )
    if not lead:
        # Explicit 204 instead of 404 (absence is expected before first save)
        return Response(status_code=204)
    return LeadOut(id=lead.id, name=lead.name, email=lead.email, created_at=lead.created_at.isoformat())

@app.post("/lead", response_model=LeadOut)
async def save_lead(lead_in: LeadIn, x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Save or update lead info tied to the per-visitor client id."""
    try:
        client_id = (lead_in.client_id or x_client_id or "anonymous").strip() or "anonymous"
        user = _get_or_create_user_by_client_id(db, client_id)

        # Upsert behavior: if a lead exists for client, update; else create new
        existing = (
            db.query(Lead)
            .filter(Lead.client_id == client_id)
            .order_by(Lead.id.desc())
            .first()
        )
        if existing:
            existing.name = lead_in.name
            existing.email = str(lead_in.email)
            db.add(existing)
            db.commit()
            db.refresh(existing)
            lead = existing
        else:
            lead = Lead(user_id=user.id, client_id=client_id, name=lead_in.name, email=str(lead_in.email))
            db.add(lead)
            db.commit()
            db.refresh(lead)

        return LeadOut(id=lead.id, name=lead.name, email=lead.email, created_at=lead.created_at.isoformat())
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving lead: {str(e)}")

# Aliases under /api for clients that prefix API paths
@app.get("/api/lead", response_model=LeadOut | None, status_code=200)
async def get_lead_api(x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    return await get_lead(x_client_id=x_client_id, db=db)

@app.post("/api/lead", response_model=LeadOut)
async def save_lead_api(lead_in: LeadIn, x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    return await save_lead(lead_in=lead_in, x_client_id=x_client_id, db=db)

# Widget config endpoints (single global config for now)
def _get_or_create_widget_config(db: Session) -> WidgetConfig:
    cfg = db.query(WidgetConfig).first()
    if not cfg:
        cfg = WidgetConfig(form_enabled=True, form_fields=[
            {"name":"name","label":"Your Name","type":"text","required":False,"placeholder":"Optional name","order":0},
            {"name":"email","label":"Email","type":"email","required":True,"placeholder":"you@example.com","order":1}
        ])
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

@app.get("/widget-config", response_model=WidgetConfigOut)
async def get_widget_config(db: Session = Depends(get_db)):
    cfg = _get_or_create_widget_config(db)
    fields = cfg.form_fields or []
    return WidgetConfigOut(form_enabled=cfg.form_enabled, fields=fields)

@app.post("/widget-config", response_model=WidgetConfigOut)
async def update_widget_config(data: WidgetConfigIn, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    cfg = _get_or_create_widget_config(db)
    cfg.form_enabled = data.form_enabled
    # store fields in deterministic order
    cfg.form_fields = sorted([f.dict() for f in data.fields], key=lambda x: (x.get('order',0), x.get('name','')))
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return WidgetConfigOut(form_enabled=cfg.form_enabled, fields=cfg.form_fields or [])

# Dynamic form submission (generic) - optional future replacement for /lead
@app.post("/form/submit")
async def submit_dynamic_form(payload: dict, x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    cfg = _get_or_create_widget_config(db)
    fields = cfg.form_fields or []
    # basic validation
    required_missing = []
    normalized = {}
    for f in fields:
        key = f.get('name')
        if not key:
            continue
        val = payload.get(key)
        if f.get('required') and (val is None or str(val).strip()==""):
            required_missing.append(key)
        else:
            if val is not None:
                normalized[key] = val
    if required_missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(required_missing)}")
    # store alongside existing lead semantics if email field present
    email_val = normalized.get('email')
    name_val = normalized.get('name')
    if email_val:
        # reuse save_lead logic path for persistence in leads table
        try:
            client_id = (x_client_id or 'anonymous').strip() or 'anonymous'
            user = _get_or_create_user_by_client_id(db, client_id)
            existing = (
                db.query(Lead)
                .filter(Lead.client_id == client_id)
                .order_by(Lead.id.desc())
                .first()
            )
            if existing:
                if name_val is not None:
                    existing.name = name_val
                existing.email = str(email_val)
                db.add(existing); db.commit(); db.refresh(existing)
            else:
                new_lead = Lead(user_id=user.id, client_id=client_id, name=name_val or '', email=str(email_val))
                db.add(new_lead); db.commit(); db.refresh(new_lead)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error saving lead: {str(e)}")
    return {"saved": True, "data": normalized}

# Chat/message aliases under /api for embedders that prefix paths
@app.post("/api/chat", response_model=ChatOut)
async def chat_api(chat_data: ChatIn, x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    return await chat(chat_data=chat_data, x_client_id=x_client_id, db=db)

@app.get("/api/messages")
async def get_messages_api(x_client_id: str | None = Header(default=None), db: Session = Depends(get_db)):
    return await get_messages(x_client_id=x_client_id, db=db)

@app.post("/system-prompt", response_model=SystemPromptOut)
async def set_system_prompt(prompt_data: SystemPromptIn, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Set a new system prompt"""
    try:
        existing_prompt = db.query(Prompt).filter(Prompt.is_default == True).first()
        if existing_prompt:
            db.delete(existing_prompt)

        new_prompt = Prompt(
            name="Default System Prompt",
            text=prompt_data.text,
            is_default=True
        )
        db.add(new_prompt)
        db.commit()

        return SystemPromptOut(text=prompt_data.text, is_custom=True)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error setting system prompt: {str(e)}")

@app.delete("/system-prompt")
async def reset_system_prompt(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Reset to default system prompt"""
    try:
        existing_prompt = db.query(Prompt).filter(Prompt.is_default == True).first()
        if existing_prompt:
            db.delete(existing_prompt)
            db.commit()
        
        return {"message": "System prompt reset to default"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error resetting system prompt: {str(e)}")

@app.post("/documents/upload", response_model=DocumentUploadOut)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Upload and process a document for the knowledge base"""
    try:
        # Validate file type
        allowed_extensions = {'.pdf', '.docx', '.txt'}
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}")
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process document with RAG service
        document = rag_service.process_document(db, str(file_path), file.filename)
        
        return DocumentUploadOut(
            id=document.id,
            filename=document.filename,
            document_type=document.document_type,
            upload_date=document.upload_date.isoformat(),
            processed=document.processed,
            chunk_count=document.chunk_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.get("/documents", response_model=DocumentListOut)
async def list_documents(db: Session = Depends(get_db)):
    """List all documents in the knowledge base"""
    try:
        documents = rag_service.list_documents(db)
        doc_list = [
            DocumentUploadOut(
                id=doc.id,
                filename=doc.filename,
                document_type=doc.document_type,
                upload_date=doc.upload_date.isoformat(),
                processed=doc.processed,
                chunk_count=doc.chunk_count
            )
            for doc in documents
        ]
        return DocumentListOut(documents=doc_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")

@app.delete("/documents/{document_id}", response_model=DocumentDeleteOut)
async def delete_document(document_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Delete a document from the knowledge base"""
    try:
        success = rag_service.delete_document(db, document_id)
        if success:
            return DocumentDeleteOut(message="Document deleted successfully", success=True)
        else:
            raise HTTPException(status_code=404, detail="Document not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting document: {str(e)}")

@app.get("/", response_class=HTMLResponse)
async def get_chat_interface():
    """Serve the chat interface with system prompt configuration"""
    html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChatBot with Custom System Prompt</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #fafafa;
        }
        .section h2 {
            margin-top: 0;
            color: #555;
        }
        textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            resize: vertical;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
        }
        button:hover {
            background-color: #0056b3;
        }
        button.reset {
            background-color: #6c757d;
        }
        button.reset:hover {
            background-color: #545b62;
        }
        .chat-container {
            margin-top: 20px;
        }
        .messages {
            height: 300px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            background: white;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
            line-height: 1.35;
        }
        .message.user {
            background-color: #e3f2fd;
            text-align: right;
        }
        .message.assistant {
            background-color: #f1f8e9;
        }
        .message.assistant p { margin: 0.35em 0; }
        .message.assistant ul, .message.assistant ol { margin: 0.35em 0 0.35em 1.2em; }
        .message.assistant pre {
            background: #f6f8fa;
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .message.assistant code { background: #f6f8fa; padding: 0 3px; border-radius: 3px; }
        .message.assistant h1, .message.assistant h2, .message.assistant h3 { margin: 0.4em 0 0.3em; }
        .message.assistant a { color: #0366d6; text-decoration: none; }
        .message.assistant a:hover { text-decoration: underline; }
        .input-group {
            display: flex;
            gap: 10px;
        }
        .input-group input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            display: none;
        }
        .status.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js"></script>
</head>
<body>
    <div class="container">
        <h1> ChatBot with Custom System Prompt</h1>
        
        <div class="section">
            <h2>System Prompt Configuration</h2>
            <textarea id="systemPrompt" rows="4" placeholder="Enter your system prompt here..."></textarea>
            <br><br>
            <button onclick="setSystemPrompt()">Set System Prompt</button>
            <button onclick="resetSystemPrompt()" class="reset">Reset to Default</button>
            <button onclick="loadCurrentPrompt()" style="background-color: #28a745;">Load Current</button>
            
            <div id="status" class="status"></div>
        </div>
        
        <div class="section">
            <h2>Visitor Form Config</h2>
            <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:6px;">
                <input type="checkbox" id="toggleFormEnabled" /> Enable pre-chat form
            </label>
            <div id="widgetConfigStatus" style="font-size:12px;margin-bottom:10px;color:#198754;"></div>
            <div id="formFieldsContainer" style="border:1px solid #ddd;padding:10px;border-radius:6px;background:#fff;margin-bottom:8px;">
                <p style="font-size:12px;color:#666;">Loading fields...</p>
            </div>
            <button id="addFieldBtn" type="button" style="background:#0d6efd;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:13px;">Add Field</button>
            <div style="margin-top:14px;font-size:12px;color:#666;">Changes auto-save. Field "name" becomes key. To capture lead email use field named <code>email</code>.</div>
        </div>

        <div class="section">
            <h2>�📚 Knowledge Base Management</h2>
            <div style="margin-bottom: 15px;">
                <input type="file" id="documentFile" accept=".pdf,.docx,.txt" style="margin-bottom: 10px;">
                <br>
                <button onclick="uploadDocument()">Upload Document</button>
                <button onclick="loadDocuments()" style="background-color: #17a2b8;">Refresh List</button>
            </div>
            <div id="documentStatus" class="status"></div>
            <div id="documentList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-top: 10px;">
                <p>Loading documents...</p>
            </div>
        </div>
        
        <div class="section">
            <h2>Form Entries</h2>
            <div id="formEntries" style="max-height: 220px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 18px; background: #fff; border-radius: 6px;">
                <p>Loading form entries...</p>
            </div>
        </div>

        <div class="section">
            <h2>Chat</h2>
            <div class="messages" id="messages"></div>
            <div class="input-group">
                <input type="text" id="messageInput" placeholder="Type your message..." onkeypress="handleKeyPress(event)">
                <button onclick="sendMessage()">Send</button>
            </div>
        </div>
    </div>

    <script>
    const DEFAULT_PROMPT = "You are a helpful AI assistant. Please provide accurate, helpful, and friendly responses to user questions.";
    // Per-visitor client ID stored in localStorage
    function getClientId() {
        try {
            const key = 'chat_client_id';
            let id = localStorage.getItem(key);
            if (!id) {
                if (window.crypto && crypto.randomUUID) {
                    id = crypto.randomUUID();
                } else {
                    id = 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
                }
                localStorage.setItem(key, id);
            }
            return id;
        } catch (_) {
            // Fallback if localStorage blocked
            return 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        }
    }
        
        async function loadCurrentPrompt() {
            try {
                const response = await fetch('/system-prompt');
                const data = await response.json();
                document.getElementById('systemPrompt').value = data.text;
                showStatus('Current system prompt loaded', 'success');
            } catch (error) {
                showStatus('Error loading system prompt: ' + error.message, 'error');
            }
        }
        
        async function setSystemPrompt() {
            const text = document.getElementById('systemPrompt').value.trim();
            if (!text) {
                showStatus('Please enter a system prompt', 'error');
                return;
            }
            
            try {
                const response = await fetch('/system-prompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });
                
                if (response.ok) {
                    showStatus('System prompt updated successfully!', 'success');
                } else {
                    const error = await response.json();
                    showStatus('Error: ' + error.detail, 'error');
                }
            } catch (error) {
                showStatus('Error setting system prompt: ' + error.message, 'error');
            }
        }
        
        async function resetSystemPrompt() {
            try {
                const response = await fetch('/system-prompt', {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    document.getElementById('systemPrompt').value = DEFAULT_PROMPT;
                    showStatus('System prompt reset to default', 'success');
                } else {
                    const error = await response.json();
                    showStatus('Error: ' + error.detail, 'error');
                }
            } catch (error) {
                showStatus('Error resetting system prompt: ' + error.message, 'error');
            }
        }

    async function loadMessages() {
            try {
        const res = await fetch('/messages', { headers: { 'X-Client-Id': getClientId() } });
                const data = await res.json();
                const messagesDiv = document.getElementById('messages');
                messagesDiv.innerHTML = '';
                (data.messages || []).forEach(m => addMessage(m.role, m.content));
            } catch (e) {
                // ignore UI errors
            }
        }

        async function loadLead() {
            try {
                const res = await fetch('/lead', { headers: { 'X-Client-Id': getClientId() } });
                if (!res.ok) return; // 404 = no lead yet
                const data = await res.json();
                document.getElementById('leadName').value = data.name || '';
                document.getElementById('leadEmail').value = data.email || '';
                showLeadStatus('Loaded saved info', 'success');
            } catch (_) { /* ignore */ }
        }

        async function saveLead() {
            const name = document.getElementById('leadName').value.trim();
            const email = document.getElementById('leadEmail').value.trim();
            if (!name || !email) {
                showLeadStatus('Please enter both name and email', 'error');
                return;
            }
            try {
                const res = await fetch('/lead', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Client-Id': getClientId(),
                    },
                    body: JSON.stringify({ name, email, client_id: getClientId() })
                });
                if (res.ok) {
                    showLeadStatus('Saved!', 'success');
                } else {
                    const err = await res.json().catch(() => ({}));
                    showLeadStatus('Error: ' + (err.detail || res.statusText), 'error');
                }
            } catch (e) {
                showLeadStatus('Error: ' + e.message, 'error');
            }
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;
            addMessage('user', message);
            input.value = '';
            
            try {
                const nameEl = document.getElementById('leadName');
                const emailEl = document.getElementById('leadEmail');
                const name = nameEl ? nameEl.value.trim() : '';
                const email = emailEl ? emailEl.value.trim() : '';
                const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                const payload = { message, client_id: getClientId(), ...(name ? { name } : {}) };
                if (emailOk && email) payload.email = email;
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Client-Id': getClientId(),
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.detail || err.message || response.statusText);
                }
                const data = await response.json();
                
                // Add KB indicator if knowledge base was used
                let reply = data.reply;
                if (data.used_faq) {
                    reply = "📚 " + reply;
                }
                
                addMessage('assistant', reply);
            } catch (error) {
                addMessage('assistant', 'Error: ' + error.message);
            }
        }
        
        function renderMarkdownToHtml(mdText) {
            try {
                if (window.marked && window.DOMPurify) {
                    const raw = marked.parse(mdText, { breaks: true });
                    // Sanitize and allow basic formatting + links
                    return DOMPurify.sanitize(raw, {
                        ALLOWED_TAGS: ['p','strong','em','ul','ol','li','code','pre','h1','h2','h3','blockquote','a','br'],
                        ALLOWED_ATTR: ['href','title','target','rel']
                    });
                }
            } catch (e) {
                // fall through to plain text
            }
            // Fallback: escape as plain text
            const div = document.createElement('div');
            div.textContent = mdText;
            return div.innerHTML;
        }

        function addMessage(role, content) {
            const messages = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}`;
            // Render Markdown safely for assistant; keep user text as-is but still sanitized
            const html = renderMarkdownToHtml(content);
            messageDiv.innerHTML = html;
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }
        
        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = `status ${type}`;
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }
        
        function showDocumentStatus(message, type) {
            const status = document.getElementById('documentStatus');
            status.textContent = message;
            status.className = `status ${type}`;
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }

        function showLeadStatus(message, type) {
            const status = document.getElementById('leadStatus');
            status.textContent = message;
            status.className = `status ${type}`;
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 2500);
        }
        
        async function uploadDocument() {
            const fileInput = document.getElementById('documentFile');
            const file = fileInput.files[0];
            
            if (!file) {
                showDocumentStatus('Please select a file to upload', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                showDocumentStatus('Uploading and processing document...', 'success');
                const response = await fetch('/documents/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showDocumentStatus(`Document "${result.filename}" uploaded successfully! Processed into ${result.chunk_count} chunks.`, 'success');
                    fileInput.value = ''; // Clear file input
                    loadDocuments(); // Refresh document list
                } else {
                    showDocumentStatus('Error: ' + result.detail, 'error');
                }
            } catch (error) {
                showDocumentStatus('Error uploading document: ' + error.message, 'error');
            }
        }
        
        async function loadDocuments() {
            try {
                const response = await fetch('/documents');
                const data = await response.json();
                
                const documentList = document.getElementById('documentList');
                
                if (data.documents.length === 0) {
                    documentList.innerHTML = '<p>No documents uploaded yet.</p>';
                    return;
                }
                
                let html = '<h4>Uploaded Documents:</h4>';
                data.documents.forEach(doc => {
                    const uploadDate = new Date(doc.upload_date).toLocaleString();
                    const statusIcon = doc.processed ? '✅' : '⏳';
                    html += `
                        <div style="border: 1px solid #ccc; padding: 8px; margin: 5px 0; border-radius: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${statusIcon} ${doc.filename}</strong><br>
                                    <small>Type: ${doc.document_type} | Chunks: ${doc.chunk_count} | Uploaded: ${uploadDate}</small>
                                </div>
                                <button onclick="deleteDocument(${doc.id}, '${doc.filename}')" style="background-color: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                            </div>
                        </div>
                    `;
                });
                
                documentList.innerHTML = html;
            } catch (error) {
                document.getElementById('documentList').innerHTML = '<p>Error loading documents: ' + error.message + '</p>';
            }
        }
        
        async function deleteDocument(docId, filename) {
            if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
                return;
            }
            
            try {
                const response = await fetch(`/documents/${docId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showDocumentStatus(`Document "${filename}" deleted successfully`, 'success');
                    loadDocuments(); // Refresh document list
                } else {
                    showDocumentStatus('Error: ' + result.detail, 'error');
                }
            } catch (error) {
                showDocumentStatus('Error deleting document: ' + error.message, 'error');
            }
        }
        
        async function loadFormEntries() {
            try {
                const res = await fetch('/form-entries');
                const data = await res.json();
                const entriesDiv = document.getElementById('formEntries');
                if (!data.entries || !data.entries.length) {
                    entriesDiv.innerHTML = '<p>No form entries yet.</p>';
                    return;
                }
                let html = '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
                html += '<tr style="background:#f1f1f1;"><th>Name</th><th>Email</th><th>Client ID</th><th>Date</th></tr>';
                data.entries.forEach(e => {
                    html += `<tr><td>${e.name||''}</td><td>${e.email}</td><td>${e.client_id}</td><td>${new Date(e.created_at).toLocaleString()}</td></tr>`;
                });
                html += '</table>';
                entriesDiv.innerHTML = html;
            } catch (e) {
                document.getElementById('formEntries').innerHTML = '<p>Error loading entries.</p>';
            }
        }

        // Load current prompt, documents, messages, lead, and form entries on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadCurrentPrompt();
            loadDocuments();
            loadMessages();
            loadLead();
            loadFormEntries();
            // Dynamic form fields config (predefined safe set; admin chooses & sets required only)
            const cb=document.getElementById('toggleFormEnabled');
            const container=document.getElementById('formFieldsContainer');
            const addBtn=document.getElementById('addFieldBtn');
            const PREDEFINED=[
                {kind:'name', label:'Your Name', name:'name', type:'text', placeholder:'Optional name', required:false},
                {kind:'email', label:'Email', name:'email', type:'email', placeholder:'you@example.com', required:true},
                {kind:'company', label:'Company', name:'company', type:'text', placeholder:'Acme Inc.', required:false},
                {kind:'phone', label:'Phone', name:'phone', type:'text', placeholder:'+1 555 123 4567', required:false},
                {kind:'country', label:'Country', name:'country', type:'text', placeholder:'Country', required:false}
            ];
            let currentFields=[];
            function findPreset(kind){ return PREDEFINED.find(p=>p.kind===kind)||PREDEFINED[0]; }
            function ensureDefaults(f){
                // Map legacy fields without kind
                if(!f.kind){
                    const match=PREDEFINED.find(p=>p.name===f.name) || PREDEFINED[0];
                    f.kind=match.kind;
                }
                return f;
            }
            function renderFields(){
                if(!container) return;
                if(!currentFields.length){ container.innerHTML='<p style="font-size:12px;color:#666;">No fields. Click "Add Field".</p>'; return; }
                container.innerHTML='';
                currentFields.sort((a,b)=>(a.order||0)-(b.order||0));
                currentFields.forEach((f,idx)=>{
                    ensureDefaults(f);
                    const row=document.createElement('div');
                    row.style.cssText='display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;background:#f8f9fa;padding:6px;border-radius:4px;';
                    const options=PREDEFINED.map(p=>`<option value="${p.kind}" ${p.kind===f.kind?'selected':''}>${p.label}</option>`).join('');
                    row.innerHTML=`<select class="fld-kind" style="padding:4px;min-width:130px;">${options}</select>
                    <span style="font-size:13px;">as</span>
                    <label style="font-size:11px;display:flex;align-items:center;gap:4px;">
                        <input type="checkbox" class="fld-req" ${f.required?'checked':''}/> required
                    </label>
                    <input type="number" value="${f.order||idx}" style="width:60px;padding:4px;" class="fld-order" />
                    <button type="button" class="btn-del" style="background:#dc3545;color:#fff;border:none;padding:4px 6px;border-radius:4px;cursor:pointer;">✕</button>`;
                    container.appendChild(row);
                    row.querySelector('.btn-del').onclick=()=>{ currentFields=currentFields.filter(x=>x!==f); renderFields(); persist(); };
                    row.querySelector('.fld-kind').onchange=()=>{ const preset=findPreset(row.querySelector('.fld-kind').value); f.kind=preset.kind; f.label=preset.label; f.name=preset.name; f.type=preset.type; f.placeholder=preset.placeholder; renderFields(); persist(); };
                    row.querySelector('.fld-req').onchange=()=>{ f.required=row.querySelector('.fld-req').checked; persist(); };
                    row.querySelector('.fld-order').onchange=()=>{ f.order=parseInt(row.querySelector('.fld-order').value)||0; persist(); };
                });
            }
            let persistTimer=null;
            async function persist(){
                clearTimeout(persistTimer);
                persistTimer=setTimeout(async()=>{
                    try {
                        const body={ form_enabled: cb.checked, fields: currentFields.map((f,i)=>({ ...f, order: f.order??i })) };
                        const res= await fetch('/widget-config',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
                        if(res.ok){ document.getElementById('widgetConfigStatus').textContent='Saved'; try { localStorage.setItem('widget_config_version', Date.now().toString()); } catch(_){ } setTimeout(()=>{document.getElementById('widgetConfigStatus').textContent='';},1200);} else { document.getElementById('widgetConfigStatus').textContent='Error'; }
                    }catch(e){ document.getElementById('widgetConfigStatus').textContent='Network error'; }
                },150);
            }
            if(addBtn){ addBtn.onclick=()=>{ const preset=PREDEFINED[0]; currentFields.push({...preset, order: currentFields.length}); renderFields(); persist(); }; }
            if(cb){ cb.addEventListener('change', persist); }
            fetch('/widget-config').then(r=>r.json()).then(c=>{ if(cb) cb.checked=!!c.form_enabled; currentFields=(c.fields||[]).map(ensureDefaults); renderFields(); });
        });
    </script>
</body>
</html>
    """
    return html_content

@app.get("/api")
async def root():
    return {"message": "ChatBot API is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}
