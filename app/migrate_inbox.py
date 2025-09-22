import sqlite3
import os

def migrate_inbox_tables(db_path: str):
    """Add inbox-related columns to existing tables"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Add new columns to users table
        cursor.execute("PRAGMA table_info(users);")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "name" not in columns:
            print("Adding name column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN name VARCHAR(255);")
        
        if "email" not in columns:
            print("Adding email column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN email VARCHAR(255);")
        
        if "ip_address" not in columns:
            print("Adding ip_address column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN ip_address VARCHAR(45);")
        
        if "created_at" not in columns:
            print("Adding created_at column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;")
        
        if "last_activity" not in columns:
            print("Adding last_activity column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN last_activity DATETIME;")

        # Add new columns to sessions table
        cursor.execute("PRAGMA table_info(sessions);")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "title" not in columns:
            print("Adding title column to sessions table...")
            cursor.execute("ALTER TABLE sessions ADD COLUMN title VARCHAR(255);")
        
        if "last_message_at" not in columns:
            print("Adding last_message_at column to sessions table...")
            cursor.execute("ALTER TABLE sessions ADD COLUMN last_message_at DATETIME;")

        # Add client_id column to form_responses table if missing
        cursor.execute("PRAGMA table_info(form_responses);")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "client_id" not in columns:
            print("Adding client_id column to form_responses table...")
            cursor.execute("ALTER TABLE form_responses ADD COLUMN client_id VARCHAR(128);")

        conn.commit()
        print("Inbox migration completed successfully.")

    except sqlite3.Error as e:
        print(f"Database error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    DB_PATH = os.getenv("DB_URL", "sqlite:///app/chatbot.db").replace("sqlite:///", "")
    migrate_inbox_tables(DB_PATH)
