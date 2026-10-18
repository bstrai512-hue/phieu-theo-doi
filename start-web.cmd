@echo off
setlocal
cd /d "%~dp0"
set "PATH=%~dp0..\tools\node-v24.22.0-win-x64;%PATH%"
call npm.cmd run dev -- --port 5173 --strictPort
pause
