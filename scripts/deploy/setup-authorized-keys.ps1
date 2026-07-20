#Requires -RunAsAdministrator
# Wire deploy public key into OpenSSH authorized_keys (Windows Admin account).
# Usage (elevated): powershell -ExecutionPolicy Bypass -File .\scripts\deploy\setup-authorized-keys.ps1

$ErrorActionPreference = "Stop"

$pub = Join-Path $env:USERPROFILE ".ssh\recruiter_deploy_ed25519.pub"
if (-not (Test-Path $pub)) {
  throw "Missing $pub — run ssh-keygen first (scripts/deploy/bootstrap-deploy-ssh.ps1)"
}
$pubLine = (Get-Content $pub -Raw).Trim()

$userAuth = Join-Path $env:USERPROFILE ".ssh\authorized_keys"
New-Item -ItemType Directory -Force -Path (Split-Path $userAuth) | Out-Null
if (-not (Test-Path $userAuth) -or -not (Select-String -Path $userAuth -Pattern ([regex]::Escape($pubLine)) -Quiet)) {
  Add-Content -Path $userAuth -Value $pubLine -Encoding ascii
}
icacls $userAuth /inheritance:r | Out-Null
icacls $userAuth /grant:r "$($env:USERNAME):(R)" | Out-Null

# Administrators group uses ProgramData path on Windows OpenSSH.
$adminAuth = "C:\ProgramData\ssh\administrators_authorized_keys"
New-Item -ItemType Directory -Force -Path "C:\ProgramData\ssh" | Out-Null
if (-not (Test-Path $adminAuth) -or -not (Select-String -Path $adminAuth -Pattern ([regex]::Escape($pubLine)) -Quiet)) {
  Add-Content -Path $adminAuth -Value $pubLine -Encoding ascii
}
icacls $adminAuth /inheritance:r | Out-Null
icacls $adminAuth /grant "SYSTEM:(F)" | Out-Null
icacls $adminAuth /grant "BUILTIN\Administrators:(F)" | Out-Null

Write-Host "authorized_keys updated:"
Write-Host "  $userAuth"
Write-Host "  $adminAuth"
Get-Content $pub
