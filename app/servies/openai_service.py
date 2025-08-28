from openai import OpenAI
from ..config import settings

client=OpenAI(api_key=settings.OPENAI_API_KEY)

def ensure_user_assistant( open_ai_assistant_id: str | None,
    system_prompt: str | None = None,
    file_ids: list[str] | None = None):
    return settings.OPENAI_ASSISTANT_ID

def run_assistant_chat(assistant_id:str,messages:list[dict[str,str]])->tuple[str,str | None]:

    thread=client.beta.threads.create()