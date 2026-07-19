# TECH-006 WP-1 - PostgreSQL backup (Docker Compose, local files only)
# Usage: .\scripts\backup\backup.ps1
$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "../.."))

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.production" }
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "backups" }
$Keep = if ($env:BACKUP_KEEP) { [int]$env:BACKUP_KEEP } else { 7 }

if (-not (Test-Path $EnvFile)) {
  throw "Missing $EnvFile - copy from .env.production.example"
}

function Get-DotEnvValue([string]$Path, [string]$Key, [string]$Default) {
  $line = Get-Content $Path | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) { return $Default }
  return ($line -split "=", 2)[1]
}

$PostgresUser = Get-DotEnvValue $EnvFile "POSTGRES_USER" "recruiter"
$PostgresDb = Get-DotEnvValue $EnvFile "POSTGRES_DB" "recruiter_copilot"
$Compose = @("compose", "--env-file", $EnvFile)

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$OutName = "postgres-$PostgresDb-$Stamp.dump"
$Remote = "/tmp/$OutName"
$Local = Join-Path $BackupDir $OutName

Write-Host "==> Backup Postgres ($PostgresDb) via compose service postgres"
& docker @Compose exec -T postgres pg_dump -U $PostgresUser -d $PostgresDb --format=custom --file=$Remote
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }

& docker @Compose cp "postgres:${Remote}" $Local
if ($LASTEXITCODE -ne 0) { throw "docker compose cp failed" }
& docker @Compose exec -T postgres rm -f $Remote | Out-Null

$Bytes = (Get-Item $Local).Length
if ($Bytes -lt 100) { throw "Backup verification failed: file too small (${Bytes} bytes)" }

Write-Host "==> Verify archive listing (pg_restore -l)"
$backupAbs = ((Resolve-Path $BackupDir).Path -replace "\\", "/")
$toc = docker run --rm -v "${backupAbs}:/b:ro" postgres:16-alpine pg_restore -l "/b/$OutName"
if ($LASTEXITCODE -ne 0) { throw "pg_restore -l failed" }
$tocLines = @($toc).Count
if ($tocLines -lt 1) { throw "Backup verification failed: empty pg_restore listing" }

Write-Host "==> Retention KEEP=$Keep"
Get-ChildItem -Path $BackupDir -Filter "postgres-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Keep |
  ForEach-Object {
    Write-Host "    prune $($_.Name)"
    Remove-Item -Force $_.FullName
  }

Write-Host "==> OK $Local (${Bytes} bytes, ${tocLines} toc lines)"
Write-Output $Local
