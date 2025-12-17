# Broker Copilot Startup Script
# Starts backend and frontend in separate terminal windows

Write-Host "Starting Broker Copilot..." -ForegroundColor Cyan

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    exit 1
}

$backendCmd = "cd '$PSScriptRoot\backend'; npm run dev"
$frontendCmd = "cd '$PSScriptRoot\frontend'; npm run dev"

# Start Backend
Write-Host "Launching Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# Wait a moment
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Launching Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "Servers starting in separate windows..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:4000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close the external terminal windows to stop the servers." -ForegroundColor Yellow
Write-Host ""
Pause
