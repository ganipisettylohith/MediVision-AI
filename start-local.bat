@echo off
echo Starting MediVision AI Locally...

:: Ensure we are in the correct directory even if run as Administrator
cd /d "%~dp0"

:: Start the Backend in a new window (Using python -m ensures it works even if pip/uvicorn aren't in PATH)
echo Starting Backend...
start "MediVision Backend" cmd /k "cd /d "%~dp0backend" && echo Installing backend dependencies... && python -m pip install -r requirements.txt && echo Starting FastAPI server... && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Start the Frontend in a new window
echo Starting Frontend...
start "MediVision Frontend" cmd /k "cd /d "%~dp0frontend" && echo Installing frontend dependencies... && npm install && echo Starting Vite development server... && npm run dev"

echo Both frontend and backend are starting in separate windows!
echo You can close this window now.
pause
