# Bootstrap deploy SSH on this Windows production host (non-elevated parts + guides elevated).
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\deploy\bootstrap-deploy-ssh.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
Set-Location $RepoRoot

$sshDir = Join-Path $env:USERPROFILE ".ssh"
New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
$key = Join-Path $sshDir "recruiter_deploy_ed25519"
$pub = "$key.pub"

if (-not (Test-Path $key)) {
  Write-Host "==> Generating ed25519 key"
  ssh-keygen -t ed25519 -f $key -N '""' -C "github-actions-recruitersup-deploy"
} else {
  Write-Host "==> Key already exists: $key"
}

$lan = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.InterfaceAlias -match 'Wi-Fi|WiFi|Ethernet' -and
    $_.IPAddress -notlike '169.*' -and
    $_.IPAddress -notlike '172.2*' -and
    $_.PrefixOrigin -ne 'WellKnown'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress
if (-not $lan) { $lan = "unknown" }

Write-Host ""
Write-Host "=== Architecture (detected) ==="
Write-Host "Host:        $env:COMPUTERNAME"
Write-Host "User:        $env:USERNAME"
Write-Host "DEPLOY_PATH: $RepoRoot"
Write-Host "LAN IP:      $lan"
Write-Host "App URL:     https://app.recruitersup.online (Cloudflare Tunnel -> localhost:3000)"
Write-Host ""

$sshd = Get-Service sshd -ErrorAction SilentlyContinue
if (-not $sshd) {
  Write-Host "OpenSSH Server NOT installed. Right-click Run as administrator:"
  Write-Host "  scripts\deploy\install-openssh-as-admin.cmd"
} else {
  Write-Host "sshd status: $($sshd.Status) / $($sshd.StartType)"
  Write-Host "If needed, elevate: scripts\deploy\setup-authorized-keys.ps1"
}

Write-Host ""
Write-Host "=== Public key ==="
Get-Content $pub
Write-Host ""
Write-Host "=== GitHub Secrets ==="
Write-Host "DEPLOY_HOST     = public IP / DDNS / CF SSH host (must reach TCP 22 from GitHub)"
Write-Host "DEPLOY_USER     = $env:USERNAME"
Write-Host "DEPLOY_PATH     = $RepoRoot"
Write-Host "DEPLOY_SSH_KEY  = private key file (never commit)"
Write-Host ""
Write-Host "Commands:"
Write-Host ('  gh secret set DEPLOY_USER --body "{0}"' -f $env:USERNAME)
Write-Host ('  gh secret set DEPLOY_PATH --body "{0}"' -f $RepoRoot)
Write-Host ('  Get-Content "{0}" -Raw | gh secret set DEPLOY_SSH_KEY' -f $key)
Write-Host '  gh secret set DEPLOY_HOST --body "YOUR_REACHABLE_HOST"'
Write-Host ""
Write-Host "See docs/GITHUB_ACTIONS_SSH_DEPLOY.md"
