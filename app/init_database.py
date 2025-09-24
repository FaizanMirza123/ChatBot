#!/usr/bin/env python3
"""
Comprehensive database initialization script
This script ensures all tables exist and are properly configured
without interfering with existing data
"""
import sqlite3
import os
import sys
from pathlib import Path

def init_database():
    """Initialize the database with all required tables and data"""
    db_path = "/app/app/chatbot.db"
    
    # Ensure the database directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔧 Initializing database...")
        
        # Create migration history table first
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migration_history (
                id INTEGER PRIMARY KEY,
                migration VARCHAR(100) UNIQUE,
                version VARCHAR(20),
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Check if database is already initialized
        cursor.execute("SELECT version FROM migration_history WHERE migration = 'full_init'")
        if cursor.fetchone():
            print("✅ Database already initialized, skipping...")
            return True
        
        # Create all tables using SQLAlchemy-compatible SQL
        tables = [
            # Users table
            """CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                external_user_id VARCHAR(128) NOT NULL,
                name VARCHAR(255),
                email VARCHAR(255),
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP
            )""",
            
            # Sessions table
            """CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                status VARCHAR(16) DEFAULT 'open',
                title VARCHAR(255),
                session_metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP,
                last_message_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )""",
            
            # Messages table
            """CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY,
                session_id INTEGER NOT NULL,
                role VARCHAR(16) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
            )""",
            
            # FAQs table
            """CREATE TABLE IF NOT EXISTS faqs (
                id INTEGER PRIMARY KEY,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""",
            
            # Prompts table
            """CREATE TABLE IF NOT EXISTS prompts (
                id INTEGER PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                text TEXT NOT NULL,
                is_default BOOLEAN DEFAULT 0
            )""",
            
            # Forms table
            """CREATE TABLE IF NOT EXISTS forms (
                id INTEGER PRIMARY KEY,
                fields_schema JSON NOT NULL
            )""",
            
            # Knowledge documents table
            """CREATE TABLE IF NOT EXISTS knowledge_documents (
                id INTEGER PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed BOOLEAN DEFAULT 0,
                chunk_count INTEGER DEFAULT 0
            )""",
            
            # Document chunks table
            """CREATE TABLE IF NOT EXISTS document_chunks (
                id INTEGER PRIMARY KEY,
                document_id INTEGER NOT NULL,
                chunk_text TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                vector_id VARCHAR(255) NOT NULL,
                FOREIGN KEY (document_id) REFERENCES knowledge_documents (id) ON DELETE CASCADE
            )""",
            
            # Document visibility table
            """CREATE TABLE IF NOT EXISTS document_visibility (
                id INTEGER PRIMARY KEY,
                document_id INTEGER NOT NULL UNIQUE,
                is_public BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES knowledge_documents (id) ON DELETE CASCADE
            )""",
            
            # Form responses table
            """CREATE TABLE IF NOT EXISTS form_responses (
                id INTEGER PRIMARY KEY,
                form_id INTEGER NOT NULL,
                user_id INTEGER,
                client_id VARCHAR(128),
                response_json JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )""",
            
            # Leads table
            """CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                client_id VARCHAR(128) NOT NULL,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )""",
            
            # Widget config table
            """CREATE TABLE IF NOT EXISTS widget_config (
                id INTEGER PRIMARY KEY,
                form_enabled BOOLEAN DEFAULT 1,
                form_fields JSON,
                primary_color VARCHAR(32),
                avatar_url VARCHAR(500),
                bot_name VARCHAR(100) DEFAULT 'ChatBot',
                widget_icon VARCHAR(10) DEFAULT '💬',
                widget_position VARCHAR(10) DEFAULT 'right',
                input_placeholder VARCHAR(100) DEFAULT 'Type your message...',
                subheading VARCHAR(200),
                show_branding BOOLEAN DEFAULT 1,
                open_by_default BOOLEAN DEFAULT 0,
                starter_questions BOOLEAN DEFAULT 1
            )""",
            
            # Messaging config table
            """CREATE TABLE IF NOT EXISTS messaging_config (
                id INTEGER PRIMARY KEY,
                ai_model VARCHAR(50) DEFAULT 'gpt-4o',
                conversational BOOLEAN DEFAULT 1,
                strict_faq BOOLEAN DEFAULT 1,
                response_length VARCHAR(20) DEFAULT 'Medium',
                suggest_followups BOOLEAN DEFAULT 0,
                allow_images BOOLEAN DEFAULT 0,
                show_sources BOOLEAN DEFAULT 1,
                post_feedback BOOLEAN DEFAULT 1,
                multilingual BOOLEAN DEFAULT 1,
                show_welcome BOOLEAN DEFAULT 1,
                welcome_message VARCHAR(500) DEFAULT 'Hey there, how can I help you?',
                no_source_message VARCHAR(500) DEFAULT 'The bot is yet to be trained, please add the data and train the bot.',
                server_error_message VARCHAR(500) DEFAULT 'Apologies, there seems to be a server error.'
            )""",
            
            # Starter questions table
            """CREATE TABLE IF NOT EXISTS starter_questions (
                id INTEGER PRIMARY KEY,
                questions JSON DEFAULT '[]',
                enabled BOOLEAN DEFAULT 1
            )"""
        ]
        
        # Create all tables
        for table_sql in tables:
            cursor.execute(table_sql)
        
        # Insert default configurations if they don't exist
        cursor.execute("SELECT COUNT(*) FROM widget_config")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO widget_config (
                    form_enabled, primary_color, bot_name, widget_icon, 
                    widget_position, input_placeholder, subheading, 
                    show_branding, open_by_default, starter_questions,
                    form_fields
                ) VALUES (
                    1, '#0d6efd', 'ChatBot', '💬', 'right', 
                    'Type your message...', 'Our bot answers instantly',
                    1, 0, 1, '[]'
                )
            """)
            print("✅ Created default widget configuration")
        
        cursor.execute("SELECT COUNT(*) FROM messaging_config")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO messaging_config (
                    ai_model, conversational, strict_faq, response_length,
                    suggest_followups, allow_images, show_sources, post_feedback,
                    multilingual, show_welcome, welcome_message, no_source_message,
                    server_error_message
                ) VALUES (
                    'gpt-4o', 1, 1, 'Medium', 0, 0, 1, 1, 1, 1,
                    'Hey there, how can I help you?',
                    'The bot is yet to be trained, please add the data and train the bot.',
                    'Apologies, there seems to be a server error.'
                )
            """)
            print("✅ Created default messaging configuration")
        
        cursor.execute("SELECT COUNT(*) FROM starter_questions")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO starter_questions (questions, enabled) 
                VALUES ('[]', 1)
            """)
            print("✅ Created default starter questions configuration")
        
        # Record this initialization as completed
        cursor.execute("""
            INSERT OR REPLACE INTO migration_history (migration, version) 
            VALUES ('full_init', '1.0')
        """)
        
        conn.commit()
        print("✅ Database initialization completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = init_database()
    if success:
        print("🎉 Database is ready!")
        sys.exit(0)
    else:
        print("💥 Database initialization failed!")
        sys.exit(1)
