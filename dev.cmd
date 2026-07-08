@echo off
rem Dev-server launcher: ensures Node.js is on PATH (needed when the parent
rem process was started before Node was installed).
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
call npm run dev
