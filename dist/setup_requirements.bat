@echo off
color 0B
echo ========================================================
echo   A/L MCQ HUB - Automated Python Dependencies Setup
echo ========================================================
echo.
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python is not installed or not in system PATH!
    echo Please install Python 3.10+ from: https://www.python.org/downloads/
    echo **CRITICAL**: Make sure to check "Add python.exe to PATH" during installation!
    echo.
    pause
    exit /b 1
)
python --version

echo.
echo [2/4] Upgrading pip package manager...
python -m pip install --upgrade pip

echo.
echo [3/4] Installing required Python AI, Audio & PDF packages...
echo (notebooklm-py, playwright, pypdf, reportlab, httpx, python-dotenv, edge-tts)
python -m pip install notebooklm-py playwright pypdf reportlab httpx python-dotenv edge-tts

echo.
echo [4/4] Installing Playwright Chromium PDF Engine...
python -m playwright install chromium

echo.
echo ========================================================
echo   SUCCESS! All dependencies installed successfully.
echo   You can now start the bot using bot.exe (or install_background_bot.bat)
echo ========================================================
echo.
pause
