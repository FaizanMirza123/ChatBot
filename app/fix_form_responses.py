import sqlite3
import os

def fix_form_responses_table(db_path: str):
    """Fix form_responses table by recreating it with proper schema"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Get existing data
        cursor.execute("SELECT * FROM form_responses;")
        existing_data = cursor.fetchall()
        
        # Get column info
        cursor.execute("PRAGMA table_info(form_responses);")
        columns = cursor.fetchall()
        
        print(f"Found {len(existing_data)} existing records")
        
        # Drop the table
        cursor.execute("DROP TABLE form_responses;")
        
        # Recreate with proper schema
        cursor.execute("""
            CREATE TABLE form_responses (
                id INTEGER NOT NULL,
                form_id INTEGER NOT NULL,
                user_id INTEGER,
                client_id VARCHAR(128),
                response_json JSON NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                PRIMARY KEY (id),
                FOREIGN KEY(form_id) REFERENCES forms (id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
            );
        """)
        
        # Recreate index
        cursor.execute("CREATE INDEX ix_form_responses_form_id ON form_responses (form_id);")
        
        # Restore data (skip client_id for now as it wasn't in original data)
        for row in existing_data:
            if len(row) == 5:  # Original format without client_id
                cursor.execute("""
                    INSERT INTO form_responses (id, form_id, user_id, response_json, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, row)
            else:  # New format with client_id
                cursor.execute("""
                    INSERT INTO form_responses (id, form_id, user_id, client_id, response_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, row)
        
        conn.commit()
        print("form_responses table recreated successfully.")

    except sqlite3.Error as e:
        print(f"Database error during fix: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    from config import settings
    DB_PATH = settings.DB_URL.replace("sqlite:///", "")
    fix_form_responses_table(DB_PATH)
