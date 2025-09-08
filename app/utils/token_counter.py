"""
Token counting utilities with fallback for when tiktoken is unavailable
"""
try:
    import tiktoken
except ImportError:
    tiktoken = None

def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """
    Count tokens in text. Falls back to word-based estimation if tiktoken unavailable.
    """
    if tiktoken is not None:
        try:
            # Use the appropriate encoding for the model
            if model.startswith("gpt-4"):
                encoding = tiktoken.encoding_for_model("gpt-4")
            else:
                encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            return len(encoding.encode(text))
        except Exception:
            pass
    
    # Fallback: rough estimation (1 token ≈ 0.75 words for English)
    word_count = len(text.split())
    return max(1, int(word_count / 0.75))

def count_messages_tokens(messages: list[dict], model: str = "gpt-3.5-turbo") -> int:
    """
    Count tokens for a list of OpenAI messages.
    Includes overhead for message formatting.
    """
    total = 0
    for message in messages:
        # Each message has some overhead tokens for role/formatting
        total += 4  # base overhead per message
        total += count_tokens(message.get("content", ""), model)
        
    total += 2  # conversation overhead
    return total

def trim_history_to_token_budget(
    messages: list[dict], 
    max_tokens: int, 
    model: str = "gpt-3.5-turbo"
) -> list[dict]:
    """
    Trim message history to fit within token budget.
    Keeps most recent messages, preserving conversation flow.
    """
    if not messages:
        return []
    
    # Always keep system message if present
    result = []
    other_messages = []
    
    for msg in messages:
        if msg.get("role") == "system":
            result.append(msg)
        else:
            other_messages.append(msg)
    
    if not other_messages:
        return result
    
    # Add messages from most recent, checking token budget
    current_tokens = count_messages_tokens(result, model)
    
    # Work backwards through non-system messages
    for msg in reversed(other_messages):
        msg_tokens = count_tokens(msg.get("content", ""), model) + 4  # +4 for message overhead
        if current_tokens + msg_tokens <= max_tokens:
            result.insert(-1 if result and result[-1].get("role") == "system" else len(result), msg)
            current_tokens += msg_tokens
        else:
            break
    
    return result
