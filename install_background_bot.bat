@echo off
color 0A
echo ===================================================
echo   Setting up A/L MCQ Bot Background Auto-Start
echo ===================================================
echo.

:: Get current directory where the batch script is running
set "CURRENT_DIR=%~dp0"
set "VBS_PATH=%CURRENT_DIR%run_bot_hidden.vbs"

:: Step 1: Create the VBScript that runs Node.js bot.cjs completely hidden (WindowStyle 0)
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.CurrentDirectory = "%CURRENT_DIR%" >> "%VBS_PATH%"
echo WshShell.Run "node bot.cjs", 0 >> "%VBS_PATH%"

:: Step 2: Create a shortcut to the VBScript in the Windows Startup folder
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\AL_MCQ_Bot.lnk"

:: Use PowerShell to cleanly create the shortcut
powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%SHORTCUT_PATH%'); $shortcut.TargetPath = 'wscript.exe'; $shortcut.Arguments = '\"%VBS_PATH%\"'; $shortcut.WorkingDirectory = '%CURRENT_DIR%'; $shortcut.WindowStyle = 7; $shortcut.Save()"

echo [OK] Hidden script created at: %VBS_PATH%
echo [OK] Startup shortcut added to: %SHORTCUT_PATH%
echo.
echo SUCCESS! The bot is now configured to start completely hidden in the background every time you turn on this computer.
echo.
echo To start it right now in the background, double-click 'run_bot_hidden.vbs'
echo Or to start it in a visible console window, double-click 'start_bot.bat'.
echo.
pause
