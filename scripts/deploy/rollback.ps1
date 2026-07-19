# TECH-006 WP-3 - Rollback helpers (image | git)
# Usage:
#   .\scripts\deploy\rollback.ps1 -Mode image
#   .\scripts\deploy\rollback.ps1 -Mode git -Target founder-alpha-1
param(
  [ValidateSet("image", "git")]
  [string]$Mode = "image",
  [string]$Target = "founder-alpha-1"
)

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "../.."))

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.production" }
$Port = if ($env:PORT) { $env:PORT } else { "3000" }
$Compose = @("compose", "--env-file", $EnvFile)
$ImageLocal = "aiheadhunter-api"
$PreviousTag = "${ImageLocal}:previous"

if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }

function Wait-Health {
  for ($i = 1; $i -le 36; $i++) {
    Start-Sleep -Seconds 5
    try {
      $body = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5).Content
      if ($body -match '"status"\s*:\s*"ok"') {
        Write-Host "==> Health OK"
        Write-Host $body
        return
      }
    } catch { }
  }
  throw "Rollback finished but /health not ok"
}

if ($Mode -eq "image") {
  $prevId = docker images -q $PreviousTag | Select-Object -First 1
  if (-not $prevId) {
    throw "No local tag $PreviousTag. Run update.ps1 first, or use -Mode git."
  }
  Write-Host "==> Image rollback: retag $PreviousTag -> ${ImageLocal}:latest"
  docker tag $PreviousTag "${ImageLocal}:latest"
  Write-Host "==> Recreate api from local image (no build)"
  & docker @Compose up -d --no-build api
  if ($LASTEXITCODE -ne 0) { throw "compose up api failed" }
  Wait-Health
  & docker @Compose ps
  return
}

# git mode
Write-Host "==> Git rollback to $Target"
$exists = git rev-parse --verify "$Target^{commit}" 2>$null
if ($LASTEXITCODE -ne 0) { throw "Unknown git target: $Target" }

Write-Host "WARNING: This checks out $Target in the working tree."
git checkout $Target
if ($LASTEXITCODE -ne 0) { throw "git checkout failed" }

& docker @Compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "compose up --build failed" }
Wait-Health
& docker @Compose ps
Write-Host "When incident is over: git checkout main && git pull origin main"
