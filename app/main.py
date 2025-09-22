from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Header, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from openai import OpenAI
from config import settings
from db import get_db, Base, engine
from models import Prompt, KnowledgeDocument, Message, User, Session as ChatSession, Lead, WidgetConfig, FAQ, DocumentVisibility, MessagingConfig, StarterQuestions, FormResponse
from schemas import ChatIn, ChatResponseOut, SystemPromptIn, SystemPromptOut, DocumentUploadOut, DocumentListOut, DocumentDeleteOut, ChatMessageOut, ChatDetailOut, UserOut, UserDetailOut, ChatOut
from schemas import LeadIn, LeadOut, WidgetConfigOut, WidgetConfigIn
from schemas import FormField, BotConfigOut, BotConfigIn, MessagingConfigOut, MessagingConfigIn, StarterQuestionsOut, StarterQuestionsIn
from services.rag_service import RAGService
from utils.token_counter import trim_history_to_token_budget
import os
import shutil
from pathlib import Path
import csv
from io import StringIO

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

# iFrame endpoint for widget embedding
@app.get("/widget-iframe", response_class=HTMLResponse)
async def widget_iframe():
    """Serve the widget as an iframe for embedding"""
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatbot Widget</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #chatbot-widget {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="chatbot-widget"></div>
    <script src="/static/chatbot-widget.v2.js" data-api-base="/" defer onload="window.createChatbotWidget({ apiBase: '/' });"></script>
</body>
</html>
    """)

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
def _get_client_session(db: Session, client_id: str) -> ChatSession | None:
    """Get existing session for client, return None if no session exists."""
    user = db.query(User).filter(User.external_user_id == client_id).first()
    if not user:
        return None
    
    sess = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id, ChatSession.status == "open")
        .order_by(ChatSession.id.desc())
        .first()
    )
    return sess

def _get_or_create_client_session(db: Session, client_id: str, name: str | None = None, email: str | None = None, ip_address: str | None = None) -> ChatSession:
    """Return a per-client session keyed by a stable client_id (from header or body).
    Only creates session when there's actual user interaction (form submit or chat message)."""
    # Each unique client_id maps to one User and one open Session
    user = db.query(User).filter(User.external_user_id == client_id).first()
    if not user:
        user = User(
            external_user_id=client_id,
            name=name,
            email=email,
            ip_address=ip_address
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user info if provided
        updated = False
        if name and not user.name:
            user.name = name
            updated = True
        if email and not user.email:
            user.email = email
            updated = True
        if ip_address and not user.ip_address:
            user.ip_address = ip_address
            updated = True
        if updated:
            user.last_activity = func.now()
            db.add(user)
            db.commit()

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
    Uses X-Client-Id header as the isolation key. Only returns messages if session exists.
    """
    try:
        client_id = x_client_id or "anonymous"
        sess = _get_client_session(db, client_id)
        if not sess:
            return {"messages": []}
        trimmed = _fetch_history_by_token_budget(db, sess.id)
        # Return trimmed messages in chronological order
        return {"messages": trimmed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")

# Removed multi-session management endpoints in single-session mode

@app.post("/chat", response_model=ChatResponseOut)
async def chat(chat_data: ChatIn, x_client_id: str | None = Header(default=None), x_forwarded_for: str | None = Header(default=None), x_real_ip: str | None = Header(default=None), db: Session = Depends(get_db)):
    """Chat endpoint with token-budgeted message history.
    - Loads recent messages for the session within token limits
    - Persists the new user message and the assistant reply
    - Passes history to the RAG service for context
    """
    try:
        system_prompt = get_current_system_prompt(db)

        # Extract IP address from headers
        ip_address = None
        if x_real_ip:
            ip_address = x_real_ip
        elif x_forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            ip_address = x_forwarded_for.split(',')[0].strip()

        # Build OpenAI-formatted history for the caller's isolated session
        client_id = (chat_data.client_id or x_client_id or "anonymous").strip() or "anonymous"
        sess = _get_or_create_client_session(
            db, 
            client_id, 
            name=chat_data.name, 
            email=chat_data.email, 
            ip_address=ip_address
        )
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
        
        # Update session's last_message_at timestamp
        sess.last_message_at = func.now()
        
        # Set session title from first user message if not already set
        if not sess.title:
            sess.title = chat_data.message[:50] + "..." if len(chat_data.message) > 50 else chat_data.message
        
        db.add(sess)
        db.commit()
        db.refresh(user_msg)

        # Get messaging configuration
        messaging_cfg = _get_or_create_messaging_config(db)
        messaging_config = {
            'ai_model': messaging_cfg.ai_model,
            'conversational': messaging_cfg.conversational,
            'strict_faq': messaging_cfg.strict_faq,
            'response_length': messaging_cfg.response_length,
            'welcome_message': messaging_cfg.welcome_message,
            'server_error_message': messaging_cfg.server_error_message
        }

        # Generate response with token-budgeted history and messaging config
        reply, used_kb = rag_service.generate_rag_response(
            chat_data.message, system_prompt, history=history, messaging_config=messaging_config
        )

        # Persist assistant reply
        assistant_msg = Message(session_id=sess.id, role="assistant", content=reply)
        db.add(assistant_msg)
        
        # Update session's last_message_at timestamp again for assistant message
        sess.last_message_at = func.now()
        db.add(sess)
        db.commit()

        return ChatResponseOut(reply=reply, used_faq=used_kb, run_id="rag-response")

    except Exception as e:
        db.rollback()
        return ChatResponseOut(reply=f"Error: {str(e)}", used_faq=False, run_id=None)

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
        cfg = WidgetConfig(
            form_enabled=True,
            primary_color="#0d6efd",
            avatar_url=None,
            bot_name="ChatBot",
            widget_icon="💬",
            widget_position="right",
            input_placeholder="Type your message...",
            subheading="Our bot answers instantly",
            show_branding=True,
            open_by_default=False,
            starter_questions=True,
            form_fields=[
                {"name":"name","label":"Your Name","type":"text","required":False,"placeholder":"Optional name","order":0},
                {"name":"email","label":"Email","type":"email","required":True,"placeholder":"you@example.com","order":1}
            ]
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

@app.get("/widget-config", response_model=WidgetConfigOut)
async def get_widget_config(db: Session = Depends(get_db)):
    cfg = _get_or_create_widget_config(db)
    fields_raw = cfg.form_fields or []
    # Back-compat: allow storing theme color inside a special meta object in form_fields
    primary = cfg.primary_color
    if not primary:
        try:
            meta = next((f for f in fields_raw if isinstance(f, dict) and f.get('name')=='__config'), None)
            if meta and isinstance(meta.get('style'), dict):
                primary = meta['style'].get('primary_color')
        except Exception:
            primary = None
    # Meta fallback for avatar
    avatar_url = cfg.avatar_url
    if not avatar_url:
        try:
            meta = next((f for f in fields_raw if isinstance(f, dict) and f.get('name')=='__config'), None)
            if meta and isinstance(meta.get('style'), dict):
                avatar_url = meta['style'].get('avatar_url')
        except Exception:
            avatar_url = None
    # Exclude meta from returned fields
    fields = [f for f in fields_raw if not (isinstance(f, dict) and f.get('name')=='__config')]
    return WidgetConfigOut(
        form_enabled=cfg.form_enabled, 
        fields=fields, 
        primary_color=primary, 
        avatar_url=avatar_url, 
        bot_name=cfg.bot_name,
        widget_icon=cfg.widget_icon,
        widget_position=cfg.widget_position,
        input_placeholder=cfg.input_placeholder,
        subheading=cfg.subheading,
        show_branding=cfg.show_branding,
        open_by_default=cfg.open_by_default,
        starter_questions=cfg.starter_questions
    )

@app.post("/widget-config", response_model=WidgetConfigOut)
async def update_widget_config(data: WidgetConfigIn, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    cfg = _get_or_create_widget_config(db)
    cfg.form_enabled = data.form_enabled
    # basic color validation: allow hex like #RRGGBB/#RGB or color names
    if data.primary_color:
        color = data.primary_color.strip()
        if len(color) <= 32:
            cfg.primary_color = color
    # avatar url (string); allow clearing with empty string
    if data.avatar_url is not None:
        val = data.avatar_url.strip()
        cfg.avatar_url = val or None
    # bot name
    if data.bot_name is not None:
        cfg.bot_name = data.bot_name.strip() or "ChatBot"
    # appearance settings
    if data.widget_icon is not None:
        cfg.widget_icon = data.widget_icon.strip() or "💬"
    if data.widget_position is not None:
        cfg.widget_position = data.widget_position.strip() or "right"
    if data.input_placeholder is not None:
        cfg.input_placeholder = data.input_placeholder.strip() or "Type your message..."
    if data.subheading is not None:
        cfg.subheading = data.subheading.strip() or None
    if data.show_branding is not None:
        cfg.show_branding = data.show_branding
    if data.open_by_default is not None:
        cfg.open_by_default = data.open_by_default
    if data.starter_questions is not None:
        cfg.starter_questions = data.starter_questions
    # store fields in deterministic order
    sorted_fields = sorted([f.dict() for f in data.fields], key=lambda x: (x.get('order',0), x.get('name','')))
    cfg.form_fields = sorted_fields
    db.add(cfg)
    try:
        db.commit()
    except Exception:
        # Column may not exist in existing DBs; fallback to storing in meta inside form_fields
        db.rollback()
        try:
            fields = list(sorted_fields)
            # remove any existing meta
            fields = [f for f in fields if f.get('name') != '__config']
            fields.append({'name':'__config','type':'meta','style':{'primary_color': data.primary_color, 'avatar_url': data.avatar_url}})
            cfg.form_fields = fields
            db.add(cfg)
            db.commit()
        except Exception:
            db.rollback()
    db.refresh(cfg)
    # Build response from current state (with fallback meta if needed)
    fields_raw = cfg.form_fields or []
    primary = cfg.primary_color or (next((f for f in fields_raw if isinstance(f, dict) and f.get('name')=='__config'), {}).get('style',{}).get('primary_color'))
    avatar_url = cfg.avatar_url or (next((f for f in fields_raw if isinstance(f, dict) and f.get('name')=='__config'), {}).get('style',{}).get('avatar_url'))
    fields = [f for f in fields_raw if not (isinstance(f, dict) and f.get('name')=='__config')]
    return WidgetConfigOut(
        form_enabled=cfg.form_enabled, 
        fields=fields, 
        primary_color=primary, 
        avatar_url=avatar_url, 
        bot_name=cfg.bot_name,
        widget_icon=cfg.widget_icon,
        widget_position=cfg.widget_position,
        input_placeholder=cfg.input_placeholder,
        subheading=cfg.subheading,
        show_branding=cfg.show_branding,
        open_by_default=cfg.open_by_default,
        starter_questions=cfg.starter_questions
    )

# Bot configuration endpoints
@app.get("/bot-config", response_model=BotConfigOut)
async def get_bot_config(db: Session = Depends(get_db)):
    """Get bot configuration (bot name)"""
    cfg = _get_or_create_widget_config(db)
    return BotConfigOut(bot_name=cfg.bot_name or "ChatBot")

@app.put("/bot-config", response_model=BotConfigOut)
async def update_bot_config(data: BotConfigIn, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Update bot configuration (bot name)"""
    cfg = _get_or_create_widget_config(db)
    cfg.bot_name = data.bot_name.strip() or "ChatBot"
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return BotConfigOut(bot_name=cfg.bot_name)

# Messaging configuration helper
def _get_or_create_messaging_config(db: Session) -> MessagingConfig:
    cfg = db.query(MessagingConfig).first()
    if not cfg:
        cfg = MessagingConfig(
            ai_model="gpt-4o",
            conversational=True,
            strict_faq=True,
            response_length="Medium",
            suggest_followups=False,
            allow_images=False,
            show_sources=True,
            post_feedback=True,
            multilingual=True,
            show_welcome=True,
            welcome_message="Hey there, how can I help you?",
            no_source_message="The bot is yet to be trained, please add the data and train the bot.",
            server_error_message="Apologies, there seems to be a server error."
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

def _get_or_create_starter_questions(db: Session) -> StarterQuestions:
    """Get or create starter questions configuration (single row table)"""
    cfg = db.query(StarterQuestions).first()
    if not cfg:
        cfg = StarterQuestions(
            questions=[],
            enabled=True
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg

# Messaging configuration endpoints
@app.get("/messaging-config", response_model=MessagingConfigOut)
async def get_messaging_config(db: Session = Depends(get_db)):
    """Get messaging configuration"""
    cfg = _get_or_create_messaging_config(db)
    return MessagingConfigOut(
        ai_model=cfg.ai_model,
        conversational=cfg.conversational,
        strict_faq=cfg.strict_faq,
        response_length=cfg.response_length,
        suggest_followups=cfg.suggest_followups,
        allow_images=cfg.allow_images,
        show_sources=cfg.show_sources,
        post_feedback=cfg.post_feedback,
        multilingual=cfg.multilingual,
        show_welcome=cfg.show_welcome,
        welcome_message=cfg.welcome_message,
        no_source_message=cfg.no_source_message,
        server_error_message=cfg.server_error_message
    )

@app.put("/messaging-config", response_model=MessagingConfigOut)
async def update_messaging_config(data: MessagingConfigIn, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Update messaging configuration"""
    cfg = _get_or_create_messaging_config(db)
    
    # Update fields if provided
    if data.ai_model is not None:
        cfg.ai_model = data.ai_model.strip() or "gpt-4o"
    if data.conversational is not None:
        cfg.conversational = data.conversational
    if data.strict_faq is not None:
        cfg.strict_faq = data.strict_faq
    if data.response_length is not None:
        cfg.response_length = data.response_length.strip() or "Medium"
    if data.suggest_followups is not None:
        cfg.suggest_followups = data.suggest_followups
    if data.allow_images is not None:
        cfg.allow_images = data.allow_images
    if data.show_sources is not None:
        cfg.show_sources = data.show_sources
    if data.post_feedback is not None:
        cfg.post_feedback = data.post_feedback
    if data.multilingual is not None:
        cfg.multilingual = data.multilingual
    if data.show_welcome is not None:
        cfg.show_welcome = data.show_welcome
    if data.welcome_message is not None:
        cfg.welcome_message = data.welcome_message.strip() or "Hey there, how can I help you?"
    if data.no_source_message is not None:
        cfg.no_source_message = data.no_source_message.strip() or "The bot is yet to be trained, please add the data and train the bot."
    if data.server_error_message is not None:
        cfg.server_error_message = data.server_error_message.strip() or "Apologies, there seems to be a server error."
    
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    
    return MessagingConfigOut(
        ai_model=cfg.ai_model,
        conversational=cfg.conversational,
        strict_faq=cfg.strict_faq,
        response_length=cfg.response_length,
        suggest_followups=cfg.suggest_followups,
        allow_images=cfg.allow_images,
        show_sources=cfg.show_sources,
        post_feedback=cfg.post_feedback,
        multilingual=cfg.multilingual,
        show_welcome=cfg.show_welcome,
        welcome_message=cfg.welcome_message,
        no_source_message=cfg.no_source_message,
        server_error_message=cfg.server_error_message
    )

# Starter questions configuration endpoints
@app.get("/starter-questions", response_model=StarterQuestionsOut)
async def get_starter_questions(db: Session = Depends(get_db)):
    """Get starter questions configuration"""
    cfg = _get_or_create_starter_questions(db)
    return StarterQuestionsOut(
        questions=cfg.questions or [],
        enabled=cfg.enabled
    )

@app.put("/starter-questions", response_model=StarterQuestionsOut)
async def update_starter_questions(data: StarterQuestionsIn, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Update starter questions configuration"""
    cfg = _get_or_create_starter_questions(db)
    
    # Update fields if provided
    if data.questions is not None:
        # Filter out empty questions and trim whitespace
        cfg.questions = [q.strip() for q in data.questions if q and q.strip()]
    if data.enabled is not None:
        cfg.enabled = data.enabled
    
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    
    return StarterQuestionsOut(
        questions=cfg.questions or [],
        enabled=cfg.enabled
    )

# Avatar upload endpoint (stores under /static/avatars and returns the public URL)
AVATAR_DIR = Path("static/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/widget-config/avatar")
async def upload_avatar(file: UploadFile = File(...), db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    try:
        ext = Path(file.filename).suffix.lower()
        if ext not in {".png",".jpg",".jpeg",".gif",".webp",".svg"}:
            raise HTTPException(status_code=400, detail="Unsupported image type")
        # Save with a simple unique name
        filename = f"bot_{int(__import__('time').time())}{ext}"
        out_path = AVATAR_DIR / filename
        with open(out_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        url = f"/static/avatars/{filename}"
        # Optionally set as current avatar
        cfg = _get_or_create_widget_config(db)
        cfg.avatar_url = url
        db.add(cfg); db.commit(); db.refresh(cfg)
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Dynamic form submission (generic) - optional future replacement for /lead
@app.post("/form/submit")
async def submit_dynamic_form(payload: dict, x_client_id: str | None = Header(default=None), x_forwarded_for: str | None = Header(default=None), x_real_ip: str | None = Header(default=None), db: Session = Depends(get_db)):
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
    
    # Extract IP address from headers
    ip_address = None
    if x_real_ip:
        ip_address = x_real_ip
    elif x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        ip_address = x_forwarded_for.split(',')[0].strip()
    
    # Get form data - check both lowercase and capitalized versions
    email_val = normalized.get('email') or normalized.get('Email')
    name_val = normalized.get('name') or normalized.get('Name')
    client_id = (x_client_id or 'anonymous').strip() or 'anonymous'
    
    # Debug logging
    print(f"DEBUG: normalized data: {normalized}")
    print(f"DEBUG: email_val: {email_val}, name_val: {name_val}")
    
    try:
        # Create or update user and session when form is submitted
        sess = _get_or_create_client_session(
            db, 
            client_id, 
            name=name_val, 
            email=email_val, 
            ip_address=ip_address
        )
        
        # Update user data if provided
        if name_val or email_val:
            user = db.query(User).filter(User.id == sess.user_id).first()
            if user:
                if name_val and not user.name:
                    user.name = name_val
                if email_val and not user.email:
                    user.email = email_val
                if ip_address and not user.ip_address:
                    user.ip_address = ip_address
                user.last_activity = func.now()
                db.add(user)
        
        # Store form response
        form_response = FormResponse(
            form_id=1,  # Assuming form ID 1 for dynamic form
            user_id=sess.user_id,
            client_id=client_id,
            response_json=normalized
        )
        db.add(form_response)
        
        # Update lead if email present
        if email_val:
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
                db.add(existing)
            else:
                new_lead = Lead(user_id=sess.user_id, client_id=client_id, name=name_val or '', email=str(email_val))
                db.add(new_lead)
        
        db.commit()
        return {"saved": True, "data": normalized}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving form: {str(e)}")

# Chat/message aliases under /api for embedders that prefix paths
@app.post("/api/chat", response_model=ChatResponseOut)
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

# Visibility endpoints
@app.get("/documents/{document_id}/visibility")
async def get_document_visibility(document_id: int, db: Session = Depends(get_db)):
    try:
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        rec = db.query(DocumentVisibility).filter(DocumentVisibility.document_id == document_id).first()
        return {"document_id": document_id, "is_public": bool(rec.is_public) if rec else False}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching visibility: {str(e)}")

@app.post("/documents/{document_id}/visibility")
async def set_document_visibility(document_id: int, payload: dict, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    try:
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        is_public = bool(payload.get("is_public", False))
        rec = db.query(DocumentVisibility).filter(DocumentVisibility.document_id == document_id).first()
        if not rec:
            rec = DocumentVisibility(document_id=document_id, is_public=is_public)
            db.add(rec)
        else:
            rec.is_public = is_public
            db.add(rec)
        db.commit()
        return {"document_id": document_id, "is_public": is_public}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error setting visibility: {str(e)}")

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
            <h2>Widget Theme</h2>
            <div style="display:flex;align-items:center;gap:10px;margin:8px 0 10px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <label style="font-size:13px;color:#555;">Primary color:</label>
                    <input type="color" id="primaryColorPicker" value="#0d6efd" />
                    <input type="text" id="primaryColorHex" value="#0d6efd" style="width:110px;padding:4px;border:1px solid #ccc;border-radius:4px;font-size:12px;"/>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <label style="font-size:13px;color:#555;">Bot avatar:</label>
                    <input type="file" id="avatarFile" accept="image/*" />
                    <button id="uploadAvatarBtn" type="button">Upload</button>
                    <img id="avatarPreview" src="" alt="Avatar preview" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #ddd;display:none;"/>
                </div>
            </div>
            <div id="themeStatus" style="font-size:12px;margin-bottom:10px;color:#198754;"></div>
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
            const colorInput=document.getElementById('primaryColorPicker');
            const colorHex=document.getElementById('primaryColorHex');
            const themeStatus=document.getElementById('themeStatus');
            const avatarFile=document.getElementById('avatarFile');
            const uploadAvatarBtn=document.getElementById('uploadAvatarBtn');
            const avatarPreview=document.getElementById('avatarPreview');
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
                        const body={ form_enabled: cb.checked, primary_color: (colorHex.value||'').trim(), fields: currentFields.map((f,i)=>({ ...f, order: f.order??i })) };
                        const res= await fetch('/widget-config',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
                        if(res.ok){
                            const okMsg='Saved';
                            const errEl=document.getElementById('widgetConfigStatus'); if(errEl) { errEl.textContent=okMsg; setTimeout(()=>{errEl.textContent='';},1200); }
                            if(themeStatus){ themeStatus.textContent=okMsg; setTimeout(()=>{themeStatus.textContent='';},1200); }
                            try { localStorage.setItem('widget_config_version', Date.now().toString()); } catch(_){ }
                        } else {
                            const msg='Error';
                            const errEl=document.getElementById('widgetConfigStatus'); if(errEl) errEl.textContent=msg;
                            if(themeStatus) themeStatus.textContent=msg;
                        }
                    }catch(e){
                        const msg='Network error';
                        const errEl=document.getElementById('widgetConfigStatus'); if(errEl) errEl.textContent=msg;
                        if(themeStatus) themeStatus.textContent=msg;
                    }
                },150);
            }
            if(addBtn){ addBtn.onclick=()=>{ const preset=PREDEFINED[0]; currentFields.push({...preset, order: currentFields.length}); renderFields(); persist(); }; }
            if(cb){ cb.addEventListener('change', persist); }
            function syncColorInputs(val){ colorInput.value = val; colorHex.value = val; }
            if(colorInput){ colorInput.addEventListener('input', ()=>{ colorHex.value=colorInput.value; persist(); }); }
            if(colorHex){ colorHex.addEventListener('change', ()=>{ let v=colorHex.value.trim(); if(!v.startsWith('#') && /^([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)) v='#'+v; syncColorInputs(v); persist(); }); }
            async function uploadAvatar(){
                if(!avatarFile.files || !avatarFile.files[0]) return;
                const fd = new FormData();
                fd.append('file', avatarFile.files[0]);
                try{
                    themeStatus.textContent='Uploading...';
                    const res = await fetch('/widget-config/avatar', { method:'POST', body: fd });
                    const data = await res.json();
                    if(res.ok && data.url){
                        avatarPreview.src = data.url; avatarPreview.style.display='inline-block';
                        // Save avatar_url into config too (idempotent with server setting)
                        await persist();
                        themeStatus.textContent='Uploaded'; setTimeout(()=> themeStatus.textContent='', 1200);
                    } else {
                        themeStatus.textContent='Upload failed';
                    }
                }catch(e){ themeStatus.textContent='Network error'; }
            }
            if(uploadAvatarBtn){ uploadAvatarBtn.onclick=uploadAvatar; }
            fetch('/widget-config').then(r=>r.json()).then(c=>{ if(cb) cb.checked=!!c.form_enabled; const pc = (c.primary_color||'#0d6efd'); syncColorInputs(pc); if(c.avatar_url){ avatarPreview.src=c.avatar_url; avatarPreview.style.display='inline-block'; } currentFields=(c.fields||[]).map(ensureDefaults); renderFields(); });
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

# ---------------------- FAQ endpoints ----------------------

@app.post("/faqs/upload-csv")
async def upload_faqs_csv(file: UploadFile = File(...), db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    try:
        ext = Path(file.filename).suffix.lower()
        if ext not in {".csv"}:
            raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: .csv")

        content_bytes = await file.read()
        try:
            text = content_bytes.decode("utf-8")
        except Exception:
            try:
                text = content_bytes.decode("latin-1")
            except Exception:
                raise HTTPException(status_code=400, detail="Unable to decode CSV. Use UTF-8 encoding.")

        reader = csv.DictReader(StringIO(text))
        required_cols = {"question", "answer"}
        if not required_cols.issubset({(c or "").strip().lower() for c in (reader.fieldnames or [])}):
            raise HTTPException(status_code=400, detail="CSV must have headers: question,answer")

        headers = [h.strip().lower() for h in (reader.fieldnames or [])]
        q_idx = headers.index("question")
        a_idx = headers.index("answer")

        created = 0
        skipped = 0
        for row in reader:
            try:
                values = list(row.values())
                question = (values[q_idx] or "").strip()
                answer = (values[a_idx] or "").strip()
                if not question or not answer:
                    skipped += 1
                    continue
                faq = FAQ(question=question, answer=answer)
                db.add(faq)
                created += 1
            except Exception:
                skipped += 1
        if created:
            db.commit()
        return {"created": created, "skipped": skipped}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading FAQs: {str(e)}")


@app.get("/faqs")
async def list_faqs(db: Session = Depends(get_db)):
    try:
        faqs = db.query(FAQ).order_by(FAQ.id.desc()).all()
        return {"faqs": [{"id": f.id, "question": f.question, "answer": f.answer} for f in faqs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing FAQs: {str(e)}")


@app.delete("/faqs/{faq_id}")
async def delete_faq(faq_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    try:
        faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
        if not faq:
            raise HTTPException(status_code=404, detail="FAQ not found")
        db.delete(faq)
        db.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting FAQ: {str(e)}")

# Aliases under /api
@app.post("/api/faqs/upload-csv")
async def upload_faqs_csv_api(file: UploadFile = File(...), db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    return await upload_faqs_csv(file=file, db=db)

@app.get("/api/faqs")
async def list_faqs_api(db: Session = Depends(get_db)):
    return await list_faqs(db=db)

@app.delete("/api/faqs/{faq_id}")
async def delete_faq_api(faq_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    return await delete_faq(faq_id=faq_id, db=db)

# Inbox endpoints
@app.get("/api/inbox/chats", response_model=List[ChatOut])
async def get_chats(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Get all chat sessions for inbox"""
    try:
        # Get sessions with user info and message counts
        sessions = db.query(ChatSession).join(User).order_by(ChatSession.last_message_at.desc().nullslast(), ChatSession.created_at.desc()).all()
        
        chat_list = []
        for session in sessions:
            # Get message count
            message_count = db.query(Message).filter(Message.session_id == session.id).count()
            
            # Get first user message for preview
            first_user_message = db.query(Message).filter(
                Message.session_id == session.id,
                Message.role == "user"
            ).order_by(Message.created_at.asc()).first()
            
            preview = first_user_message.content[:100] + "..." if first_user_message and len(first_user_message.content) > 100 else (first_user_message.content if first_user_message else "No messages")
            
            # Generate title from first message or use default
            title = session.title or (first_user_message.content[:50] + "..." if first_user_message and len(first_user_message.content) > 50 else (first_user_message.content if first_user_message else "New Chat"))
            
            # Get user info from lead if available
            lead = db.query(Lead).filter(Lead.client_id == session.user.external_user_id).first()
            user_name = lead.name if lead else None
            user_email = lead.email if lead else None
            
            chat_list.append(ChatOut(
                id=session.id,
                title=title,
                preview=preview,
                user_name=user_name,
                user_email=user_email,
                ip_address=session.user.ip_address,
                created_at=session.created_at.isoformat(),
                last_message_at=session.last_message_at.isoformat() if session.last_message_at else session.created_at.isoformat(),
                message_count=message_count
            ))
        
        return chat_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chats: {str(e)}")

@app.get("/api/inbox/chats/{chat_id}", response_model=ChatDetailOut)
async def get_chat_detail(chat_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Get detailed chat information including all messages"""
    try:
        session = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Get all messages for this session
        messages = db.query(Message).filter(Message.session_id == chat_id).order_by(Message.created_at.asc()).all()
        
        # Get user info from lead if available
        lead = db.query(Lead).filter(Lead.client_id == session.user.external_user_id).first()
        
        user_info = {
            "name": lead.name if lead else session.user.name,
            "email": lead.email if lead else session.user.email,
            "user_id": session.user.external_user_id,
            "ip_address": session.user.ip_address,
            "chat_id": str(chat_id)
        }
        
        message_list = [
            ChatMessageOut(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at.isoformat()
            )
            for msg in messages
        ]
        
        return ChatDetailOut(
            id=session.id,
            title=session.title or "Chat",
            user_info=user_info,
            messages=message_list,
            created_at=session.created_at.isoformat(),
            last_message_at=session.last_message_at.isoformat() if session.last_message_at else session.created_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chat detail: {str(e)}")

@app.get("/api/inbox/users", response_model=List[UserOut])
async def get_users(db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Get all users for inbox"""
    try:
        # Get users with their session counts
        users = db.query(User).order_by(User.last_activity.desc().nullslast(), User.created_at.desc()).all()
        
        user_list = []
        for user in users:
            # Count sessions for this user
            session_count = db.query(ChatSession).filter(ChatSession.user_id == user.id).count()
            
            # Get user info from lead if available
            lead = db.query(Lead).filter(Lead.client_id == user.external_user_id).first()
            
            user_list.append(UserOut(
                id=user.id,
                name=lead.name if lead else user.name,
                email=lead.email if lead else user.email,
                ip_address=user.ip_address,
                last_activity=user.last_activity.isoformat() if user.last_activity else (user.created_at.isoformat() if user.created_at else 'Unknown'),
                chat_count=session_count,
                created_at=user.created_at.isoformat() if user.created_at else 'Unknown'
            ))
        
        return user_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.get("/api/inbox/users/{user_id}", response_model=UserDetailOut)
async def get_user_detail(user_id: int, db: Session = Depends(get_db), _: bool = Depends(require_admin)):
    """Get detailed user information including all sessions"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all sessions for this user
        sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.created_at.desc()).all()
        
        # Get user info from lead if available
        lead = db.query(Lead).filter(Lead.client_id == user.external_user_id).first()
        
        session_list = []
        for session in sessions:
            message_count = db.query(Message).filter(Message.session_id == session.id).count()
            session_list.append({
                "id": session.id,
                "title": session.title or "Chat",
                "status": session.status,
                "created_at": session.created_at.isoformat(),
                "last_message_at": session.last_message_at.isoformat() if session.last_message_at else session.created_at.isoformat(),
                "message_count": message_count
            })
        
        return UserDetailOut(
            id=user.id,
            name=lead.name if lead else user.name,
            email=lead.email if lead else user.email,
            ip_address=user.ip_address,
            created_at=user.created_at.isoformat() if user.created_at else 'Unknown',
            last_activity=user.last_activity.isoformat() if user.last_activity else (user.created_at.isoformat() if user.created_at else 'Unknown'),
            chat_count=len(sessions),
            sessions=session_list
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user detail: {str(e)}")
