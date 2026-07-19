# TECH-006 WP-3 - Safe Compose update with pre-record + health verify
# Usage: .\scripts\deploy\update.ps1 [-SkipBackup]
param([switch]$SkipBackup)

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "../.."))

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.production" }
$Port = if ($env:PORT) { $env:PORT } else { "3000" }
$HistoryDir = "deploy-history"
$Compose = @("compose", "--env-file", $EnvFile)
$ImageLocal = "aiheadhunter-api"
$PreviousTag = "${ImageLocal}:previous"

if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }

New-Item -ItemType Directory -Force -Path $HistoryDir | Out-Null
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$PreGit = (git rev-parse HEAD).Trim()
$PreImage = (docker images -q "${ImageLocal}:latest" | Select-Object -First 1)

if (-not $SkipBackup) {
  Write-Host "==> Pre-deploy backup (WP-1)"
  & .\scripts\backup\backup.ps1
  if ($LASTEXITCODE -ne 0) { throw "backup failed - abort update" }
} else {
  Write-Host "==> SkipBackup set - no DB backup"
}

if ($PreImage) {
  Write-Host "==> Tag current image as $PreviousTag"
  docker tag "${ImageLocal}:latest" $PreviousTag
}

$preRecord = @"
stamp=$Stamp
phase=pre
git=$PreGit
image=$PreImage
"@
Set-Content -Encoding utf8 (Join-Path $HistoryDir "pre-$Stamp.txt") $preRecord
Write-Host "==> Recorded pre-deploy -> deploy-history/pre-$Stamp.txt"

Write-Host "==> docker compose up -d --build"
& docker @Compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "compose up failed" }

Write-Host "==> Wait for /health"
$ok = $false
$body = $null
for ($i = 1; $i -le 36; $i++) {
  Start-Sleep -Seconds 5
  try {
    $body = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5).Content
    if ($body -match '"status"\s*:\s*"ok"') { $ok = $true; break }
  } catch { }
}
if (-not $ok) { throw "Update finished but /health not ok" }

$PostGit = (git rev-parse HEAD).Trim()
$PostImage = (docker images -q "${ImageLocal}:latest" | Select-Object -First 1)
$postRecord = @"
stamp=$Stamp
phase=post
git=$PostGit
image=$PostImage
health_ok=true
"@
Set-Content -Encoding utf8 (Join-Path $HistoryDir "post-$Stamp.txt") $postRecord

Write-Host "==> Update OK"
Write-Host $body
& docker @Compose ps
