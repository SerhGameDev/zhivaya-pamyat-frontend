@echo off
cd /d "%~dp0"
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE_EXE=C:\Users\serh5\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
echo Open http://127.0.0.1:5173
echo Keep this window open. Press Ctrl+C to stop.
"%NODE_EXE%" server.mjs --production
pause
