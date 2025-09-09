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
    model: str = "gpt-3.5-turbo",
) -> list[dict]:
    """
    Trim message history to fit within token budget.
    Selection prefers most recent messages, but output order is chronological: system (if any) + oldest→newest.
    """
    if not messages:
        return []

    system_msgs: list[dict] = [m for m in messages if m.get("role") == "system"]
    non_system: list[dict] = [m for m in messages if m.get("role") != "system"]

    if not non_system:
        return system_msgs[:1] if system_msgs else []

    # Start with token count of system messages (keep only the first system at top)
    kept_system = system_msgs[:1]
    current_tokens = count_messages_tokens(kept_system, model) if kept_system else 0

    # Pick from most recent to oldest within budget
    picked_recent_first: list[dict] = []
    for msg in reversed(non_system):
        msg_tokens = count_tokens(msg.get("content", ""), model) + 4  # message overhead
        if current_tokens + msg_tokens <= max_tokens:
            picked_recent_first.append(msg)
            current_tokens += msg_tokens
        else:
            break

    # Present in chronological order
    picked_chrono = list(reversed(picked_recent_first))
    return (kept_system + picked_chrono) if kept_system else picked_chrono
