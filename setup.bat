@echo off
echo Setting up ChatBot with RAG...

echo.
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

echo.
echo 🗄️ Initializing database...
python init_db.py

echo.
echo 📁 Creating necessary directories...
if not exist "uploads" mkdir uploads
if not exist "chroma_db" mkdir chroma_db

echo.
echo ✅ Setup complete!
echo.
echo To run the application:
echo   cd app
echo   uvicorn main:app --reload
echo.
echo Then open: http://localhost:8000
