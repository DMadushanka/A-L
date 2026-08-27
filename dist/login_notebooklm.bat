@echo off
title NotebookLM Google Login / Re-authentication
color 0b
echo ========================================================
echo   A/L MCQ HUB - Google NotebookLM Re-authentication
echo ========================================================
echo.
echo [INFO] Opening Google Login browser window...
echo [INFO] Please log in to your Google Account in the browser window that opens.
echo.
python -m notebooklm login
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] NotebookLM login completed successfully!
    echo ========================================================
    python -c "import shutil, pathlib; u = pathlib.Path.home()/'.notebooklm'/'profiles'/'default'/'storage_state.json'; l = pathlib.Path('storage_state.json'); shutil.copy2(u, l) if u.exists() else None; print('[SYNC] Updated local storage_state.json')"
) else (
    echo.
    echo [ERROR] Login failed or window was closed before completing login.
)
echo.
pause
