#!/usr/bin/env python3
import sqlite3
from config import settings

def check_database():
    """Check the database schema and data"""
    db_path = settings.DB_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check users table schema
        cursor.execute("PRAGMA table_info(users);")
        columns = cursor.fetchall()
        print("Users table columns:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        # Check users data
        cursor.execute("SELECT id, external_user_id, name, email, ip_address, created_at, last_activity FROM users LIMIT 3;")
        users = cursor.fetchall()
        print(f"\nUsers data (first 3 records):")
        for user in users:
            print(f"  ID: {user[0]}, external_id: {user[1]}, name: {user[2]}, email: {user[3]}, ip: {user[4]}, created: {user[5]}, last_activity: {user[6]}")

    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_database()
