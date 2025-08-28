from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List,Optional
from pydantic import Field
import os

class Settings(BaseSettings):
    APP_NAME: str = "Chatbot Backend"
    APP_ENV: str = "dev"
    APP_DEBUG: bool = True

    DB_URL: str

    OPENAI_API_KEY: str
    OPENAI_ASSISTANT_ID: Optional[str] = None

    CORS_ORIGINS: List[str] = Field(default_factory=list)
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)
    
    @property
    def cors_origins_parsed(self)->List[str]:
        if isinstance(self.CORS_ORIGINS,list):
            return self.CORS_ORIGINS
        raw=self.CORS_ORIGINS or ""
        return [o.strip() for o in raw.split(",") if o.strip()]
settings=Settings()
