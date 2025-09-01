# Use specific Python version - no auto-updates
FROM python:3.11.9-slim

# Minimal env vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install base dependencies first (these rarely change)
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Copy and install core requirements that rarely change
COPY requirements-base.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements-base.txt

# Copy and install frequently changing requirements
COPY requirements.txt ./  
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copy app contents to /app (not /app/app)
COPY app/ ./

# Set environment
ENV DB_URL=sqlite:///app/chatbot.db \
    PYTHONPATH=/app/app

# Create directories
RUN mkdir -p app/uploads app/chroma_db

EXPOSE 8000

# Simple startup - let app handle DB initialization
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]