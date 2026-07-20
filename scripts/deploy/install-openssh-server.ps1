#Requires -RunAsAdministrator
# Install + harden OpenSSH Server for GitHub Actions deploy (Windows host).
# Usage (elevated): powershell -ExecutionPolicy Bypass -File .\scripts\deploy\install-openssh-server.ps1

$ErrorActionPreference = "Stop"

Write-Host "==> Install OpenSSH.Server capability"
$cap = Get-WindowsCapability -Online -Name "OpenSSH.Server*"
if ($cap.State -ne "Installed") {
  Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0 | Out-Null
} else {
  Write-Host "    already installed"
}

Write-Host "==> Start sshd + set Automatic"
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

if (Get-Service ssh-agent -ErrorAction SilentlyContinue) {
  Set-Service -Name ssh-agent -StartupType Automatic
  Start-Service ssh-agent -ErrorAction SilentlyContinue
}

Write-Host "==> Firewall rule OpenSSH-Server-In-TCP"
if (-not (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server (sshd)" `
    -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
} else {
  Enable-NetFirewallRule -Name "OpenSSH-Server-In-TCP"
}

# Prefer PowerShell as default shell for appleboy/ssh-action scripts on Windows.
$shellKey = "HKLM:\SOFTWARE\OpenSSH"
if (-not (Test-Path $shellKey)) { New-Item -Path $shellKey -Force | Out-Null }
New-ItemProperty -Path $shellKey -Name DefaultShell `
  -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
  -PropertyType String -Force | Out-Null

Write-Host "==> sshd status"
Get-Service sshd | Format-Table Name, Status, StartType
Write-Host "OpenSSH Server ready."
