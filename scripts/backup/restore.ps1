# TECH-006 WP-1 - PostgreSQL restore (Docker Compose, local dump file)
# Usage: .\scripts\backup\restore.ps1 -DumpPath backups\postgres-....dump
# WARNING: replaces database contents. Stops API during restore.
param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath
)

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "../.."))

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.production" }
$Port = "3000"
if (Test-Path $EnvFile) {
  $p = Get-Content $EnvFile | Where-Object { $_ -match "^PORT=" } | Select-Object -First 1
  if ($p) { $Port = ($p -split "=", 2)[1] }
}
if ($env:PORT) { $Port = $env:PORT }

if (-not (Test-Path $DumpPath)) { throw "Dump not found: $DumpPath" }
if (-not (Test-Path $EnvFile)) { throw "Missing $EnvFile" }

function Get-DotEnvValue([string]$Path, [string]$Key, [string]$Default) {
  $line = Get-Content $Path | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) { return $Default }
  return ($line -split "=", 2)[1]
}

$PostgresUser = Get-DotEnvValue $EnvFile "POSTGRES_USER" "recruiter"
$PostgresDb = Get-DotEnvValue $EnvFile "POSTGRES_DB" "recruiter_copilot"
$Compose = @("compose", "--env-file", $EnvFile)

$DumpItem = Get-Item $DumpPath
$Bytes = $DumpItem.Length
if ($Bytes -lt 100) { throw "Refuse restore: dump too small (${Bytes} bytes)" }

Write-Host "==> Pre-check dump listing"
$dumpDirAbs = ((Resolve-Path $DumpItem.DirectoryName).Path -replace "\\", "/")
docker run --rm -v "${dumpDirAbs}:/b:ro" postgres:16-alpine pg_restore -l "/b/$($DumpItem.Name)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "pg_restore -l failed on dump" }

Write-Host "==> Stop API (avoid open connections)"
& docker @Compose stop api
if ($LASTEXITCODE -ne 0) { throw "compose stop api failed" }

$Remote = "/tmp/restore-$($DumpItem.Name)"
Write-Host "==> Copy dump into postgres container"
& docker @Compose cp $DumpItem.FullName "postgres:${Remote}"
if ($LASTEXITCODE -ne 0) { throw "compose cp failed" }

Write-Host "==> Recreate database $PostgresDb"
& docker @Compose exec -T postgres psql -U $PostgresUser -d postgres -v ON_ERROR_STOP=1 `
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$PostgresDb' AND pid <> pg_backend_pid();" `
  -c "DROP DATABASE IF EXISTS `"$PostgresDb`";" `
  -c "CREATE DATABASE `"$PostgresDb`" OWNER `"$PostgresUser`";"
if ($LASTEXITCODE -ne 0) { throw "recreate database failed" }

Write-Host "==> pg_restore"
& docker @Compose exec -T postgres pg_restore -U $PostgresUser -d $PostgresDb --no-owner --no-acl $Remote
$restoreCode = $LASTEXITCODE
& docker @Compose exec -T postgres rm -f $Remote | Out-Null

Write-Host "==> Start API"
& docker @Compose start api
if ($LASTEXITCODE -ne 0) { throw "compose start api failed" }

Write-Host "==> Wait for API health"
$ok = $false
for ($i = 1; $i -le 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    $body = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5).Content
    if ($body -match '"status"\s*:\s*"ok"') { $ok = $true; break }
  } catch { }
}
if (-not $ok) {
  throw "Restore finished but /health did not become ok within timeout (pg_restore exit=$restoreCode)"
}

Write-Host "==> Restore OK - /health status=ok"
