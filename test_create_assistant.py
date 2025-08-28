import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client=OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

assistant=client.beta.assistants.create(
    name="Test Assistant",
    instructions="You are a helpful assistant.",
    model="gpt-4o"
)

print("Assistant created:", assistant.id)