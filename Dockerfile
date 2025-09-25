# Use specific Python version - no auto-updates
FROM python:3.11.9-slim

# Minimal env vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/root/.cache/huggingface \
    TRANSFORMERS_CACHE=/root/.cache/huggingface \
    SENTENCE_TRANSFORMERS_HOME=/root/.cache/torch/sentence_transformers \
    FASTEMBED_CACHE_PATH=/root/.cache/fastembed

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
# Copy static assets (web widget)
COPY static/ ./static/

# Set environment
ENV DB_URL=sqlite:///app/app/chatbot.db \
    PYTHONPATH=/app/app

# Create directories
# Create directories and model caches
RUN mkdir -p app/uploads app/chroma_db /root/.cache/huggingface /root/.cache/torch/sentence_transformers /root/.cache/fastembed

# Prefetch models into image layer so they don't download on every run
# This layer will be cached unless requirements above change
RUN --mount=type=cache,target=/root/.cache/huggingface \
    --mount=type=cache,target=/root/.cache/torch \
    python - <<'PY'
from sentence_transformers import SentenceTransformer
SentenceTransformer('all-MiniLM-L6-v2')
print('Prefetched: all-MiniLM-L6-v2')
PY
# Try to prefetch fastembed ONNX model variants if fastembed is available
RUN --mount=type=cache,target=/root/.cache/huggingface \
    --mount=type=cache,target=/root/.cache/torch \
    python - <<'PY'
try:
    from fastembed import TextEmbedding
    m = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
    # Trigger model download
    list(m.embed(["prefetch"]))
    print('Prefetched via fastembed: all-MiniLM-L6-v2')
except Exception as e:
    print('Fastembed prefetch skipped:', e)
PY

EXPOSE 8000

# Start the app - database will be created by SQLAlchemy when needed
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]