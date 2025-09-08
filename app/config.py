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
    ADMIN_API_KEY: Optional[str] = None
    
    # Chat history settings
    CHAT_HISTORY_MAX_TOKENS: int = 3000  # max tokens for conversation history (leaves room for system prompt + new message + response)

    # OpenAI generation settings
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OPENAI_TEMPERATURE: float = 0.3
    OPENAI_MAX_TOKENS: int = 400

    CORS_ORIGINS: List[str] = Field(default_factory=list)
    model_config = SettingsConfigDict( env_file=str(BASE_DIR / ".env"), case_sensitive=False)
    
    @property
    def cors_origins_parsed(self)->List[str]:
        if isinstance(self.CORS_ORIGINS,list):
            return self.CORS_ORIGINS
        raw=self.CORS_ORIGINS or ""
        return [o.strip() for o in raw.split(",") if o.strip()]
settings=Settings()
