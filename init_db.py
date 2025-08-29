"""
Database initialization script for ChatBot with RAG
"""
from sqlalchemy import create_engine
from app.db import Base
from app.models import *  # Import all models
from app.config import settings

def init_database():
    # Create engine
    engine = create_engine(settings.DB_URL)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database initialized successfully!")
    print("📋 Created tables:")
    for table_name in Base.metadata.tables.keys():
        print(f"   - {table_name}")

if __name__ == "__main__":
    init_database()
