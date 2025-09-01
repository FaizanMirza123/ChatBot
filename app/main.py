from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from openai import OpenAI
from config import settings
from db import get_db
from models import Prompt, KnowledgeDocument, Message
from schemas import ChatIn, ChatOut, SystemPromptIn, SystemPromptOut, DocumentUploadOut, DocumentListOut, DocumentDeleteOut
from services.rag_service import RAGService
import os
import shutil
from pathlib import Path

app = FastAPI()

client = OpenAI(api_key=settings.OPENAI_API_KEY)


app = FastAPI()

client = OpenAI(api_key=settings.OPENAI_API_KEY)
rag_service = RAGService()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Default system prompt
DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Please provide accurate, helpful, and friendly responses to user questions."


in_memory_system_prompt = DEFAULT_SYSTEM_PROMPT
use_database = True

def get_current_system_prompt(db: Session) -> str:
    """Get the current system prompt from database or return default"""
    prompt = db.query(Prompt).filter(Prompt.is_default == True).first()
    if prompt:
        return prompt.text
    return DEFAULT_SYSTEM_PROMPT

@app.post("/chat", response_model=ChatOut)
async def chat(chat_data: ChatIn, db: Session = Depends(get_db)):
    """Chat endpoint with limited message history.
    - Loads last N messages for the provided session_id (N from settings.CHAT_HISTORY_MAX_MESSAGES)
    - Persists the new user message and the assistant reply
    - Passes history to the RAG service for context
    """
    try:
        system_prompt = get_current_system_prompt(db)

        # Fetch limited recent history for this session (excluding current user message)
        history_limit = settings.CHAT_HISTORY_MAX_MESSAGES
        prior_msgs = (
            db.query(Message)
            .filter(Message.session_id == chat_data.session_id)
            .order_by(Message.id.desc())
            .limit(history_limit)
            .all()
        )
        # Build OpenAI-formatted history in chronological order
        history = [
            {"role": m.role, "content": m.content}
            for m in reversed(prior_msgs)
            if m.role in ("user", "assistant")
        ]

        # Persist the current user message
        user_msg = Message(session_id=chat_data.session_id, role="user", content=chat_data.message)
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

        # Generate response with history
        reply, used_kb = rag_service.generate_rag_response(chat_data.message, system_prompt, history=history)

        # Persist assistant reply
        assistant_msg = Message(session_id=chat_data.session_id, role="assistant", content=reply)
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

@app.post("/system-prompt", response_model=SystemPromptOut)
async def set_system_prompt(prompt_data: SystemPromptIn, db: Session = Depends(get_db)):
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
async def reset_system_prompt(db: Session = Depends(get_db)):
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
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
async def delete_document(document_id: int, db: Session = Depends(get_db)):
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
        }
        .message.user {
            background-color: #e3f2fd;
            text-align: right;
        }
        .message.assistant {
            background-color: #f1f8e9;
        }
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
            <h2>📚 Knowledge Base Management</h2>
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
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;
            
            addMessage('user', message);
            input.value = '';
            
            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        session_id: 1, 
                        message: message 
                    })
                });
                
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
        
        function addMessage(role, content) {
            const messages = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}`;
            messageDiv.textContent = content;
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
        
        // Load current prompt and documents on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadCurrentPrompt();
            loadDocuments();
        });
    </script>
</body>
</html>
    """
    return html_content

@app.get("/api")
async def root():
    return {"message": "ChatBot API is running"}
