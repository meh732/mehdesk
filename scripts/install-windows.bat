@echo off
chcp 65001 > nul
title AnyDesk Enterprise Hub - Windows Installer
color 0B

echo ==================================================================
echo    AnyDesk Enterprise Remote Hub - Windows Node.js Installer
echo ==================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detected. Launching interactive setup engine...
node scripts/install-engine.js

pause
