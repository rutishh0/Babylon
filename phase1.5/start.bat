@echo off
title Babylon Phase 1.5
echo.
echo   ========================================
echo     Babylon Phase 1.5 - Anime Downloader
echo   ========================================
echo.

cd /d "%~dp0"

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

:: Create venv if needed
if not exist "venv\Scripts\activate.bat" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate and install deps
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
pip install -q flask

echo.
echo   Starting server on http://localhost:5000
echo   Press Ctrl+C to stop
echo.

python server.py
pause
