"""
Database initialization script
Run this script to create the database tables
"""
from sqlalchemy import create_engine
from config import settings
from models import Base
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database with all tables"""
    try:
        # Create engine
        engine = create_engine(settings.DB_URL)
        
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully!")
        
        return True
    except Exception as e:
        logger.error(f"Error creating database: {str(e)}")
        return False

if __name__ == "__main__":
    success = init_database()
    if success:
        print("Database initialized successfully!")
    else:
        print(" Database initialization failed!")
