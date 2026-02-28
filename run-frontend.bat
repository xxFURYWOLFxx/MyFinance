@echo off
title Finance Dashboard - Frontend
color 0D

echo.
echo  ====================================
echo   Finance Frontend Dev Server
echo  ====================================
echo.

:: Check if Node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

cd /d "%~dp0frontend"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found, running npm install...
    npm install
    echo.
)

echo [OK] Starting dev server on http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause
