@echo off
title Finance Dashboard - Stop Servers
color 0C

echo.
echo  ====================================
echo   Stopping Finance Dashboard Servers
echo  ====================================
echo.

:: Kill Python (backend)
echo [1/2] Stopping Backend (Python/Uvicorn)...
taskkill /F /IM python.exe /T >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo       [OK] Backend stopped
) else (
    echo       [--] No backend process found
)

:: Kill Node (frontend)
echo [2/2] Stopping Frontend (Node)...
taskkill /F /IM node.exe /T >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo       [OK] Frontend stopped
) else (
    echo       [--] No frontend process found
)

echo.
echo  ====================================
echo   All servers stopped!
echo  ====================================
echo.
pause
