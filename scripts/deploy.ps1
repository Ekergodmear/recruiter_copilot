# Founder Alpha — deploy with Docker Compose (Windows PowerShell)
# Usage: .\scripts\deploy.ps1
# Does NOT overwrite local .env (dev). Uses .env.production.

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

Write-Host "==> Recruiter Copilot production deploy" -ForegroundColor Cyan

if (-not (Test-Path ".env.production")) {
  if (Test-Path ".env.production.example") {
    Copy-Item ".env.production.example" ".env.production"
    Write-Host "Created .env.production from example — edit POSTGRES_PASSWORD before public use." -ForegroundColor Yellow
  } else {
    throw "Missing .env.production and .env.production.example"
  }
}

Write-Host "==> docker compose --env-file .env.production up -d --build"
docker compose --env-file .env.production up -d --build

Write-Host "==> Status"
docker compose --env-file .env.production ps

Write-Host ""
Write-Host "API health: http://localhost:3000/health"
Write-Host "Logs:       docker compose --env-file .env.production logs -f api"
Write-Host "Stop:       docker compose --env-file .env.production down"
