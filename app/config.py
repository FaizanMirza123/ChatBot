from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List,Optional
from pydantic import Field
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent 

class Settings(BaseSettings):
    APP_NAME: str = "Chatbot Backend"
    APP_ENV: str = "dev"
    APP_DEBUG: bool = True

    DB_URL: str

    OPENAI_API_KEY: str
    OPENAI_ASSISTANT_ID: Optional[str] = None
    
    # Chat history settings
    CHAT_HISTORY_MAX_MESSAGES: int = 10  # number of most recent messages to include per session

    CORS_ORIGINS: List[str] = Field(default_factory=list)
    model_config = SettingsConfigDict( env_file=str(BASE_DIR / ".env"), case_sensitive=False)
    
    @property
    def cors_origins_parsed(self)->List[str]:
        if isinstance(self.CORS_ORIGINS,list):
            return self.CORS_ORIGINS
        raw=self.CORS_ORIGINS or ""
        return [o.strip() for o in raw.split(",") if o.strip()]
settings=Settings()
