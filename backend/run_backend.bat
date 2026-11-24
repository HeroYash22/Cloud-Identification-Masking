@echo off
echo Installing Python deps...
pip install -r requirements.txt
echo.
echo Starting FastAPI backend on http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
