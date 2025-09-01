import os
import re
import uuid
from typing import List, Optional, Tuple
from pathlib import Path

import chromadb
from chromadb.config import Settings
import openai
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
import PyPDF2
from docx import Document
import tiktoken

from models import KnowledgeDocument, DocumentChunk
from config import settings

class RAGService:
    def __init__(self):
      
        self.chroma_client = chromadb.PersistentClient(
            path="./chroma_db",
            settings=Settings(allow_reset=True)
        )
        
   
        self.collection = self.chroma_client.get_or_create_collection(
            name="knowledge_base",
            metadata={"hnsw:space": "cosine"}
        )
        
        
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        
        self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        
        
        self.kb_triggers = [
            "company", "business", "service", "product", "about us", "what do you do",
            "services", "products", "pricing", "cost", "price", "contact", "location",
            "address", "phone", "email", "team", "staff", "experience", "history",
            "founded", "established", "mission", "vision", "values", "policy",
            "procedure", "process", "how to", "documentation", "manual", "guide",
            "faq", "frequently asked", "help", "support", "technical", "specification"
        ]
    
    def should_use_knowledge_base(self, query: str) -> bool:
        """
        Determine if a query should use the knowledge base based on content analysis.
        Returns False for greetings and casual conversation.
        """
        query_lower = query.lower().strip()
        
        
        casual_patterns = [
            r'^(hi|hello|hey|good morning|good afternoon|good evening|greetings)!?$',
            r'^(how are you|how\'s it going|what\'s up)!?$',
            r'^(thanks|thank you|bye|goodbye|see you)!?$',
            r'^(yes|no|ok|okay|sure|fine)!?$',
        ]
        
        for pattern in casual_patterns:
            if re.match(pattern, query_lower):
                return False
        
      
        for trigger in self.kb_triggers:
            if trigger in query_lower:
                return True
      
        if len(query.split()) > 5 and ('?' in query or 'what' in query_lower or 'how' in query_lower or 'where' in query_lower):
            return True
            
        return False
    
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract text from various file formats."""
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return self._extract_from_pdf(file_path)
        elif file_extension == '.docx':
            return self._extract_from_docx(file_path)
        elif file_extension == '.txt':
            return self._extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    
    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
        return text
    
    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from Word document."""
        doc = Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    
    def _extract_from_txt(self, file_path: str) -> str:
        """Extract text from text file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def chunk_text(self, text: str, max_tokens: int = 500) -> List[str]:
        """Split text into chunks based on token count."""
        sentences = re.split(r'[.!?]+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            
            test_chunk = current_chunk + " " + sentence if current_chunk else sentence
            if len(self.tokenizer.encode(test_chunk)) > max_tokens:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence
                else:
                    
                    words = sentence.split()
                    for i in range(0, len(words), max_tokens // 4): 
                        chunk_words = words[i:i + max_tokens // 4]
                        chunks.append(" ".join(chunk_words))
            else:
                current_chunk = test_chunk
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def process_document(self, db: Session, file_path: str, filename: str) -> KnowledgeDocument:
        """Process a document and store it in the knowledge base."""
       
        text_content = self.extract_text_from_file(file_path)
        
   
        doc = KnowledgeDocument(
            filename=filename,
            file_path=file_path,
            document_type=Path(file_path).suffix.lower()[1:],  
            processed=False,
            chunk_count=0
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
       
        chunks = self.chunk_text(text_content)
        
       
        chunk_ids = []
        for i, chunk_text in enumerate(chunks):
           
            embedding = self.embedding_model.encode(chunk_text).tolist()
            
        
            vector_id = f"{doc.id}_{i}_{uuid.uuid4().hex[:8]}"
           
            self.collection.add(
                embeddings=[embedding],
                documents=[chunk_text],
                metadatas=[{
                    "document_id": doc.id,
                    "filename": filename,
                    "chunk_index": i
                }],
                ids=[vector_id]
            )
            
           
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_text=chunk_text,
                chunk_index=i,
                vector_id=vector_id
            )
            db.add(chunk)
            chunk_ids.append(vector_id)
        
       
        doc.processed = True
        doc.chunk_count = len(chunks)
        db.commit()
        
        return doc
    
    def search_knowledge_base(self, query: str, top_k: int = 3) -> List[Tuple[str, float, dict]]:
        """Search the knowledge base for relevant information."""
        if not self.should_use_knowledge_base(query):
            return []
        
        
        query_embedding = self.embedding_model.encode(query).tolist()
        
    
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents", "metadatas", "distances"]
        )
        
       
        search_results = []
        if results['documents'][0]:
            for i in range(len(results['documents'][0])):
                doc_text = results['documents'][0][i]
                metadata = results['metadatas'][0][i]
                distance = results['distances'][0][i]
                search_results.append((doc_text, distance, metadata))
        
        return search_results
    
    def generate_rag_response(self, query: str, system_prompt: str, history: list[dict] | None = None) -> Tuple[str, bool]:
        """
        Generate response using RAG if appropriate, otherwise use regular chat.
        Returns (response, used_kb)
        """
       
        if not self.should_use_knowledge_base(query):
            # Build message list with optional history
            messages: list[dict] = [{"role": "system", "content": system_prompt}]
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": query})

            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                temperature=0.2,
                messages=messages
            )
            return response.choices[0].message.content, False
        

        kb_results = self.search_knowledge_base(query)
        
        if not kb_results:
            # No KB results, fall back to regular chat with optional history
            messages: list[dict] = [{"role": "system", "content": system_prompt}]
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": query})

            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                temperature=0.2,
                messages=messages
            )
            return response.choices[0].message.content, False
        
      
        context_parts = []
        for doc_text, score, metadata in kb_results:
            if score < 0.7:  # Only use results with good similarity
                context_parts.append(f"From {metadata['filename']}: {doc_text}")
        
        if not context_parts:
            # KB wasn't confident, fall back to regular chat with optional history
            messages: list[dict] = [{"role": "system", "content": system_prompt}]
            if history:
                messages.extend(history)
            messages.append({"role": "user", "content": query})

            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                temperature=0.2,
                messages=messages
            )
            return response.choices[0].message.content, False
        
        context = "\n\n".join(context_parts)
        
        rag_system_prompt = f"""{system_prompt}

You have access to the following relevant information from the knowledge base:

{context}

IMPORTANT: Only use the provided information to answer questions. If the information doesn't contain the answer to the user's question, clearly state that you don't have that specific information in your knowledge base. Do not make up or assume information that isn't explicitly provided. Be accurate and honest about the limitations of the available information."""
        
        # Use KB context; include optional prior history to preserve continuity
        messages: list[dict] = [{"role": "system", "content": rag_system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": query})

        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            temperature=0.2,
            messages=messages
        )
        
        return response.choices[0].message.content, True
    
    def delete_document(self, db: Session, document_id: int) -> bool:
        """Delete a document and its chunks from both DB and vector store."""
        
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
        
    
        vector_ids = [chunk.vector_id for chunk in chunks]
        if vector_ids:
            self.collection.delete(ids=vector_ids)
        
     
        for chunk in chunks:
            db.delete(chunk)
        
       
        doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
        if doc:
            db.delete(doc)
            db.commit()
            return True
        
        return False
    
    def list_documents(self, db: Session) -> List[KnowledgeDocument]:
        """List all documents in the knowledge base."""
        return db.query(KnowledgeDocument).order_by(KnowledgeDocument.upload_date.desc()).all()
