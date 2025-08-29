from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import settings

engine=create_engine(settings.DB_URL,pool_pre_ping=True,future=True)
SessionLocal=sessionmaker(autocommit=False,bind=engine,autoflush=False,future=True)

class Base(DeclarativeBase):
    pass

def get_db():
 try:
    db=SessionLocal()
    yield db
 finally:
     db.close()
     