#!/usr/bin/env python3
import sqlite3

def fix_user_data():
    """Fix user data by setting default values for created_at and last_activity"""
    db_path = "/app/chatbot.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Update existing users with default values
        cursor.execute("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;")
        cursor.execute("UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE last_activity IS NULL;")
        
        conn.commit()
        print("User data fixed successfully.")
        
        # Verify the fix
        cursor.execute("SELECT id, external_user_id, created_at, last_activity FROM users LIMIT 3;")
        users = cursor.fetchall()
        print("Updated users data:")
        for user in users:
            print(f"  ID: {user[0]}, external_id: {user[1]}, created: {user[2]}, last_activity: {user[3]}")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_user_data()
