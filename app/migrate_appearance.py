#!/usr/bin/env python3
"""
Database migration script to add appearance columns to WidgetConfig table
This script should be run inside the Docker container
"""
import sqlite3
import os
from config import settings

def migrate_database():
    db_path = settings.DB_URL.replace("sqlite:///", "")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if migration has already been completed
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='migration_history'")
        migration_table_exists = cursor.fetchone()
        
        if migration_table_exists:
            cursor.execute("SELECT version FROM migration_history WHERE migration = 'appearance_migration'")
            migration_completed = cursor.fetchone()
            if migration_completed:
                print("✅ Appearance migration already completed, skipping...")
                return
        
        # Check if widget_config table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='widget_config'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("Creating widget_config table...")
            # Create the widget_config table with all columns
            cursor.execute("""
                CREATE TABLE widget_config (
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
                )
            """)
            
            # Insert default configuration
            cursor.execute("""
                INSERT INTO widget_config (
                    form_enabled, primary_color, bot_name, widget_icon, 
                    widget_position, input_placeholder, subheading, 
                    show_branding, open_by_default, starter_questions,
                    form_fields
                ) VALUES (
                    1, '#0d6efd', 'ChatBot', '💬', 'right', 
                    'Type your message...', 'Our bot answers instantly',
                    1, 0, 1,
                    '[]'
                )
            """)
            print("✅ Created widget_config table with default values")
        else:
            print("widget_config table already exists, checking for new columns...")
            
            # Check existing columns
            cursor.execute("PRAGMA table_info(widget_config)")
            existing_columns = [row[1] for row in cursor.fetchall()]
            
            # Add missing columns
            new_columns = [
                ("widget_icon", "VARCHAR(10) DEFAULT '💬'"),
                ("widget_position", "VARCHAR(10) DEFAULT 'right'"),
                ("input_placeholder", "VARCHAR(100) DEFAULT 'Type your message...'"),
                ("subheading", "VARCHAR(200)"),
                ("show_branding", "BOOLEAN DEFAULT 1"),
                ("open_by_default", "BOOLEAN DEFAULT 0"),
                ("starter_questions", "BOOLEAN DEFAULT 1")
            ]
            
            for column_name, column_def in new_columns:
                if column_name not in existing_columns:
                    try:
                        cursor.execute(f"ALTER TABLE widget_config ADD COLUMN {column_name} {column_def}")
                        print(f"✅ Added column: {column_name}")
                    except Exception as e:
                        print(f"❌ Failed to add column {column_name}: {e}")
                else:
                    print(f"✅ Column already exists: {column_name}")
        
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
            VALUES ('appearance_migration', '1.0')
        """)
        
        conn.commit()
        print("✅ Database migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
