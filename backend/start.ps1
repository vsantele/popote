# Popote Backend — Quick Start Script
# Run this after downloading PocketBase executable to backend/ directory

Write-Host "🚀 Starting Popote Backend..." -ForegroundColor Cyan

# Check if PocketBase executable exists
if (-Not (Test-Path ".\pocketbase.exe")) {
    Write-Host "❌ PocketBase not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download PocketBase:" -ForegroundColor Yellow
    Write-Host "  https://github.com/pocketbase/pocketbase/releases" -ForegroundColor White
    Write-Host ""
    Write-Host "Extract 'pocketbase.exe' to the backend/ directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PocketBase executable found" -ForegroundColor Green

# Start PocketBase
Write-Host ""
Write-Host "Starting PocketBase server..." -ForegroundColor Cyan
Write-Host "  - API: http://127.0.0.1:8090/api" -ForegroundColor White
Write-Host "  - Admin UI: http://127.0.0.1:8090/_/" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

.\pocketbase.exe serve
