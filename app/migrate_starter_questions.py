#!/usr/bin/env python3
"""
Migration script to update starter_questions table to use dynamic JSON array
"""
import sqlite3
import json
from pathlib import Path
from config import settings

def migrate_starter_questions():
    db_path = Path(settings.DB_URL.replace("sqlite:///", ""))
    if not db_path.exists():
        print("Database not found, skipping migration")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if migration has already been completed
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_history'")
        migration_table_exists = cursor.fetchone()
        
        if migration_table_exists:
            cursor.execute("SELECT version FROM migration_history WHERE migration = 'starter_questions_migration'")
            migration_completed = cursor.fetchone()
            if migration_completed:
                print("✅ Starter questions migration already completed, skipping...")
                return
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='starter_questions'")
        if not cursor.fetchone():
            print("starter_questions table doesn't exist, creating it")
            cursor.execute("""
                CREATE TABLE starter_questions (
                    id INTEGER PRIMARY KEY,
                    questions TEXT DEFAULT '[]',
                    enabled BOOLEAN DEFAULT 1
                )
            """)
            conn.commit()
            return
        
        # Check if old columns exist
        cursor.execute("PRAGMA table_info(starter_questions)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'question_1' in columns:
            print("Migrating from old format to new JSON format...")
            
            # Get existing data
            cursor.execute("SELECT question_1, question_2, question_3, question_4, enabled FROM starter_questions WHERE id = 1")
            row = cursor.fetchone()
            
            if row:
                # Convert old format to new format
                questions = []
                for i, q in enumerate(row[:4]):
                    if q and q.strip():
                        questions.append(q.strip())
                
                # Update the table structure
                cursor.execute("DROP TABLE starter_questions")
                cursor.execute("""
                    CREATE TABLE starter_questions (
                        id INTEGER PRIMARY KEY,
                        questions TEXT DEFAULT '[]',
                        enabled BOOLEAN DEFAULT 1
                    )
                """)
                
                # Insert migrated data
                cursor.execute("""
                    INSERT INTO starter_questions (id, questions, enabled) 
                    VALUES (1, ?, ?)
                """, (json.dumps(questions), row[4] if row[4] is not None else True))
                
                print(f"Migrated {len(questions)} questions to new format")
            else:
                # Create new structure if no data exists
                cursor.execute("DROP TABLE starter_questions")
                cursor.execute("""
                    CREATE TABLE starter_questions (
                        id INTEGER PRIMARY KEY,
                        questions TEXT DEFAULT '[]',
                        enabled BOOLEAN DEFAULT 1
                    )
                """)
                cursor.execute("INSERT INTO starter_questions (id, questions, enabled) VALUES (1, '[]', 1)")
                print("Created new starter_questions table with default data")
        
        # Create migration history table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS migration_history (
                id INTEGER PRIMARY KEY,
                migration VARCHAR(100) UNIQUE,
                version VARCHAR(20),
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Record this migration as completed
        cursor.execute("""
            INSERT OR REPLACE INTO migration_history (migration, version) 
            VALUES ('starter_questions_migration', '1.0')
        """)
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_starter_questions()
