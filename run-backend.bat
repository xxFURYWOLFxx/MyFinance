@echo off
title Finance Dashboard - Backend
color 0B

echo.
echo  ====================================
echo   Finance Backend Server
echo  ====================================
echo.

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

cd /d "%~dp0backend"

:: Check if venv exists and activate it
if exist "venv\Scripts\activate.bat" (
    echo [OK] Virtual environment found, activating...
    call venv\Scripts\activate.bat
) else (
    echo [INFO] No virtual environment found, using global Python
)

echo [OK] Starting server on http://localhost:3500
echo [OK] API Docs at http://localhost:3500/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 3500

pause
