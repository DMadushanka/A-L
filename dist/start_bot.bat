@echo off
color 0A
title A/L MCQ Hub Telegram Bot
echo ===================================================
echo   Starting A/L MCQ HUB Telegram Bot (Latest v2.0)
echo ===================================================
echo.
echo Checking Node.js runtime...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not added to PATH.
    echo Please download and install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Starting Telegram Bot via bot.cjs (All 5 Interactive Features Active)...
echo.
node bot.cjs
if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Bot stopped with code %errorlevel%.
    pause
)
