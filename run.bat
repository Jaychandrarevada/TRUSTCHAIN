@echo off
title TrustChain Launcher
echo ========================================
echo    Starting TrustChain (Full Stack)
echo ========================================

start "TrustChain - Backend" powershell -NoExit -Command "cd '%~dp0backend'; .\.venv\Scripts\Activate.ps1; python -m scripts.seed; python wsgi.py"
start "TrustChain - Frontend" powershell -NoExit -Command "cd '%~dp0frontend'; npm run dev"

echo.
echo Services launched!
echo  - Frontend: http://localhost:5173
echo  - Backend:  http://127.0.0.1:5000
echo  - API Docs: http://127.0.0.1:5000/api/v1/docs
echo.
