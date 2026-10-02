Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   Starting TrustChain (Full Stack)     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Yellow

# Launch Backend in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\Activate.ps1; python -m scripts.seed; python wsgi.py"

# Launch Frontend in its own window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`nServices started in separate windows:" -ForegroundColor Green
Write-Host "-> Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "-> Backend:  http://127.0.0.1:5000" -ForegroundColor Cyan
Write-Host "-> API Docs: http://127.0.0.1:5000/api/v1/docs`n" -ForegroundColor Cyan
