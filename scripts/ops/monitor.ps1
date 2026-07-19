# TECH-006 WP-2 - Lightweight ops monitor (no Prometheus/Grafana)
# Usage: .\scripts\ops\monitor.ps1
# Exit: 0=ok, 1=warn, 2=critical
$ErrorActionPreference = "Continue"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "../.."))

$EnvFile = if ($env:ENV_FILE) { $env:ENV_FILE } else { ".env.production" }
$Port = if ($env:PORT) { $env:PORT } else { "3000" }
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "backups" }
$BackupMaxAgeHours = if ($env:BACKUP_MAX_AGE_HOURS) { [int]$env:BACKUP_MAX_AGE_HOURS } else { 24 }
$DiskWarnPct = if ($env:DISK_WARN_PCT) { [int]$env:DISK_WARN_PCT } else { 80 }

$severity = 0
$warnings = New-Object System.Collections.Generic.List[string]
$criticals = New-Object System.Collections.Generic.List[string]

function Set-Worst([int]$Level) {
  if ($Level -gt $script:worst) { $script:worst = $Level }
}

Write-Host "=== Recruiter Copilot ops monitor ==="
Write-Host ("time_utc={0}" -f (Get-Date).ToUniversalTime().ToString("o"))

# --- Containers ---
Write-Host "`n-- containers --"
$psJson = docker compose --env-file $EnvFile ps --format json 2>$null
$services = @()
if ($psJson) {
  $services = $psJson | ConvertFrom-Json
  if ($services -isnot [array]) { $services = @($services) }
}
foreach ($name in @("api", "postgres")) {
  $svc = $services | Where-Object { $_.Service -eq $name } | Select-Object -First 1
  if (-not $svc) {
    Write-Host "FAIL $name missing"
    $criticals.Add("$name container missing") | Out-Null
    Set-Worst 2
    continue
  }
  $health = "$($svc.Health)"
  $state = "$($svc.State)"
  $line = "$name state=$state health=$health"
  if ($health -ne "healthy" -or $state -ne "running") {
    Write-Host "FAIL $line"
    $criticals.Add($line) | Out-Null
    Set-Worst 2
  } else {
    Write-Host "OK   $line"
  }
}

# --- API health ---
Write-Host "`n-- api /health --"
try {
  $body = (Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5).Content
  Write-Host $body
  if ($body -notmatch '"status"\s*:\s*"ok"') {
    $criticals.Add("health status not ok") | Out-Null
    Set-Worst 2
  } elseif ($body -match '"connected"\s*:\s*false') {
    $criticals.Add("database.connected false") | Out-Null
    Set-Worst 2
  } else {
    Write-Host "OK   health status=ok db connected"
  }
} catch {
  Write-Host "FAIL health unreachable: $($_.Exception.Message)"
  $criticals.Add("health unreachable") | Out-Null
  Set-Worst 2
}

# --- Disk (drive containing repo) ---
Write-Host "`n-- disk --"
$rootPath = (Resolve-Path ".").Path
$driveLetter = $rootPath.Substring(0, 1)
$drive = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
if ($drive -and $drive.Free -ne $null -and $drive.Used -ne $null) {
  $total = [double]$drive.Used + [double]$drive.Free
  $usedPct = if ($total -gt 0) { [math]::Round(100.0 * $drive.Used / $total, 1) } else { 0 }
  $freeGb = [math]::Round($drive.Free / 1GB, 2)
  Write-Host ("drive={0}: used_pct={1} free_gb={2}" -f $driveLetter, $usedPct, $freeGb)
  if ($usedPct -ge $DiskWarnPct) {
    $warnings.Add("disk used_pct=$usedPct >= $DiskWarnPct") | Out-Null
    Set-Worst 1
    Write-Host "WARN disk above threshold"
  } else {
    Write-Host "OK   disk under threshold ($DiskWarnPct%)"
  }
} else {
  Write-Host "WARN could not read disk stats"
  $warnings.Add("disk stats unavailable") | Out-Null
  Set-Worst 1
}

# --- Backup age ---
Write-Host "`n-- backup age --"
$latest = Get-ChildItem -Path $BackupDir -Filter "postgres-*.dump" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (-not $latest) {
  Write-Host "WARN no postgres-*.dump in $BackupDir"
  $warnings.Add("no backup dump found") | Out-Null
  Set-Worst 1
} else {
  $ageH = [math]::Round(((Get-Date) - $latest.LastWriteTime).TotalHours, 2)
  Write-Host ("latest={0} age_hours={1} size_bytes={2}" -f $latest.Name, $ageH, $latest.Length)
  if ($ageH -gt $BackupMaxAgeHours) {
    Write-Host "WARN backup older than RPO window ($BackupMaxAgeHours h)"
    $warnings.Add("backup age_hours=$ageH > $BackupMaxAgeHours") | Out-Null
    Set-Worst 1
  } else {
    Write-Host "OK   backup within RPO window"
  }
}

# --- Recent error-ish logs ---
Write-Host "`n-- recent api logs (ERROR/FAIL/P1000) --"
$logs = docker compose --env-file $EnvFile logs api --tail 80 2>$null
$hits = @($logs | Select-String -Pattern 'ERROR|FAIL|P1000|EACCES|no space' -CaseSensitive:$false)
if ($hits.Count -eq 0) {
  Write-Host "OK   no ERROR/FAIL/P1000 in last 80 api log lines"
} else {
  Write-Host ("WARN {0} matching line(s); showing up to 5:" -f $hits.Count)
  $hits | Select-Object -First 5 | ForEach-Object { Write-Host $_.Line }
  $warnings.Add("api logs contain error patterns ($($hits.Count))") | Out-Null
  Set-Worst 1
}

Write-Host "`n=== summary ==="
if ($criticals.Count -gt 0) {
  Write-Host "CRITICAL:"
  $criticals | ForEach-Object { Write-Host " - $_" }
}
if ($warnings.Count -gt 0) {
  Write-Host "WARNINGS:"
  $warnings | ForEach-Object { Write-Host " - $_" }
}
if ($worst -eq 0) { Write-Host "RESULT=OK" }
elseif ($worst -eq 1) { Write-Host "RESULT=WARN" }
else { Write-Host "RESULT=CRITICAL" }

exit $worst
