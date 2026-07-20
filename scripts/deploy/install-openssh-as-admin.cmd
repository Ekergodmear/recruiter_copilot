@echo off
:: Double-click or: Run as administrator
cd /d "%~dp0..\.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-openssh-server.ps1"
if errorlevel 1 pause & exit /b 1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-authorized-keys.ps1"
if errorlevel 1 pause & exit /b 1
echo.
echo OpenSSH Server + authorized_keys ready.
pause
