# docs/GITHUB_ACTIONS_SSH_DEPLOY.md — Windows host + Docker + Cloudflare Tunnel

# GitHub Actions SSH Deploy (Windows production host)

## Detected architecture

```
GitHub Actions (ubuntu)
        │  SSH (needs reachable host:22)
        ▼
Windows host (Docker Desktop)
  ├── docker compose: api:3000 + postgres
  └── cloudflared service → Cloudflare → https://app.recruitersup.online
```

Production today is **local Docker** exposed publicly only via **Cloudflare Tunnel (HTTP)**.
Tunnel HTTP ≠ SSH. GitHub runners cannot SSH to `192.168.x.x` unless you add reachability.

| Item | Value on this machine |
|------|------------------------|
| Hostname | `DESKTOP-B1RKK15` |
| User | `Admin` |
| Project path | `C:\Users\Admin\OneDrive\Desktop\AIHeadhunter` |
| App port | `3000` (published) |
| Tunnel | `Cloudflared` Windows service → `app.recruitersup.online` |

## One-time host setup

### 1) Elevate and install OpenSSH Server

```powershell
# UAC → Yes
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\install-openssh-server.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\setup-authorized-keys.ps1
```

Or non-elevated helper (prints checklist + generates key if missing):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy\bootstrap-deploy-ssh.ps1
```

### 2) Verify SSH locally

```powershell
ssh -i $env:USERPROFILE\.ssh\recruiter_deploy_ed25519 -o StrictHostKeyChecking=accept-new Admin@127.0.0.1 "hostname; cd 'C:\Users\Admin\OneDrive\Desktop\AIHeadhunter'; docker compose --env-file .env.production ps"
```

### 3) Make port 22 reachable from GitHub (pick ONE)

**A — Recommended for this architecture: self-hosted runner (no inbound SSH)**

```powershell
# On this Windows host — follow GitHub UI: Settings → Actions → Runners → New self-hosted runner
# Then set workflow runs-on: [self-hosted, windows, production]
```

**B — Router port-forward**

1. Forward WAN TCP `22` → `192.168.1.172:22`
2. `DEPLOY_HOST` = your public IP (or DDNS hostname)
3. Prefer fail2ban-equivalent / Cloudflare Spectrum / restrict by IP if possible

**C — Cloudflare Tunnel TCP / Access for SSH**

Expose SSH through Cloudflare (Zero Trust) and point `DEPLOY_HOST` at the tunnel hostname.
Requires Cloudflare Zero Trust config (manual in dashboard).

Without A/B/C, `deploy-ssh` will fail with connection timeout even if secrets are set.

## GitHub Secrets checklist

| Secret | Example / source | Notes |
|--------|------------------|-------|
| `DEPLOY_HOST` | public IP, DDNS, or CF SSH hostname | Must resolve from `ubuntu-latest` |
| `DEPLOY_USER` | `Admin` | Windows account |
| `DEPLOY_PATH` | `C:\Users\Admin\OneDrive\Desktop\AIHeadhunter` | Absolute path |
| `DEPLOY_SSH_KEY` | private key file contents | `recruiter_deploy_ed25519` (full PEM including BEGIN/END) |

```powershell
gh secret set DEPLOY_USER --body "Admin"
gh secret set DEPLOY_PATH --body "C:\Users\Admin\OneDrive\Desktop\AIHeadhunter"
gh secret set DEPLOY_SSH_KEY < $env:USERPROFILE\.ssh\recruiter_deploy_ed25519
gh secret set DEPLOY_HOST --body "YOUR_REACHABLE_HOST"
```

## Trigger deploy

```bash
gh workflow run Deploy --ref main
```

Workflow: smoke build on every `main` push; SSH deploy on `workflow_dispatch` when secrets are present.

## Local validate (no GitHub)

```powershell
cd C:\Users\Admin\OneDrive\Desktop\AIHeadhunter
.\scripts\deploy\update.ps1 -SkipBackup
curl.exe -s http://127.0.0.1:3000/health
curl.exe -sI https://app.recruitersup.online/
```
