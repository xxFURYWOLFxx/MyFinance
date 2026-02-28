@echo off
title Finance Dashboard - Initial Setup
color 0E

echo.
echo  ====================================
echo   Finance Dashboard - Initial Setup
echo  ====================================
echo.

:: Check prerequisites
echo Checking prerequisites...
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Python is not installed
    echo     Download from: https://www.python.org/downloads/
    set MISSING=1
) else (
    echo [OK] Python found
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js is not installed
    echo     Download from: https://nodejs.org/
    set MISSING=1
) else (
    echo [OK] Node.js found
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] npm is not installed
    set MISSING=1
) else (
    echo [OK] npm found
)

if defined MISSING (
    echo.
    echo [ERROR] Please install missing prerequisites and run again.
    pause
    exit /b 1
)

echo.
echo  ------------------------------------
echo   Setting up Backend
echo  ------------------------------------
echo.

cd /d "%~dp0backend"

:: Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment exists
)

:: Activate venv and install dependencies
echo Installing Python dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo [OK] Python dependencies installed

:: Create .env if it doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created .env from .env.example
    ) else (
        echo SECRET_KEY=your-super-secret-key-change-in-production> .env
        echo DATABASE_URL=sqlite:///./finance.db>> .env
        echo [OK] Created default .env file
    )
) else (
    echo [OK] .env file exists
)

:: Initialize database
echo Initializing database...
python init_db.py
echo [OK] Database initialized

echo.
echo  ------------------------------------
echo   Setting up Frontend
echo  ------------------------------------
echo.

cd /d "%~dp0frontend"

:: Install npm dependencies
echo Installing Node.js dependencies (this may take a minute)...
npm install --silent
echo [OK] Node.js dependencies installed

:: Create .env if it doesn't exist
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [OK] Created .env from .env.example
    )
) else (
    echo [OK] .env file exists
)

echo.
echo  ====================================
echo   Setup Complete!
echo  ====================================
echo.
echo   You can now run the application:
echo.
echo   - run.bat          : Start both servers
echo   - run-backend.bat  : Start backend only
echo   - run-frontend.bat : Start frontend only
echo   - stop.bat         : Stop all servers
echo.
echo   Default login:
echo   - Email:    admin@example.com
echo   - Password: admin123
echo.
pause
