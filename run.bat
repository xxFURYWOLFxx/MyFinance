@echo off
title Finance Dashboard - Full Stack
color 0A

echo.
echo  ====================================
echo   Finance Dashboard - Starting...
echo  ====================================
echo.

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo [OK] Python found
echo [OK] Node.js found
echo.

:: Start Backend
echo [1/2] Starting Backend Server...
cd /d "%~dp0backend"
start "Finance Backend" cmd /k "color 0B && title Finance Backend (Port 3500) && python -m uvicorn app.main:app --host 0.0.0.0 --port 3500"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend
echo [2/2] Starting Frontend Dev Server...
cd /d "%~dp0frontend"
start "Finance Frontend" cmd /k "color 0D && title Finance Frontend (Port 5173) && npm run dev"

echo.
echo  ====================================
echo   Both servers are starting!
echo  ====================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3500
echo   API Docs: http://localhost:3500/docs
echo.
echo   Close this window or press any key to exit.
echo   (Servers will keep running in their windows)
echo.
pause >nul
