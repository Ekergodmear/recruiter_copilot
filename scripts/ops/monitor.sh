#!/usr/bin/env bash
# TECH-006 WP-2 — Lightweight ops monitor (no Prometheus/Grafana)
# Usage: ./scripts/ops/monitor.sh
# Exit: 0=ok, 1=warn, 2=critical
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
PORT="${PORT:-3000}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-24}"
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"

worst=0
warn() { echo "WARN $*"; worst=$(( worst < 1 ? 1 : worst )); }
crit() { echo "FAIL $*"; worst=$(( worst < 2 ? 2 : worst )); }
ok() { echo "OK   $*"; }

echo "=== Recruiter Copilot ops monitor ==="
echo "time_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo
echo "-- containers --"
for name in api postgres; do
  line="$(docker compose --env-file "$ENV_FILE" ps --format '{{.Service}} {{.State}} {{.Health}}' | awk -v n="$name" '$1==n{print; found=1} END{if(!found) exit 1}')" || true
  if [[ -z "${line:-}" ]]; then
    crit "$name container missing"
  else
    state="$(echo "$line" | awk '{print $2}')"
    health="$(echo "$line" | awk '{print $3}')"
    if [[ "$state" != "running" || "$health" != "healthy" ]]; then
      crit "$name state=$state health=$health"
    else
      ok "$name state=$state health=$health"
    fi
  fi
done

echo
echo "-- api /health --"
body="$(curl -sf "http://127.0.0.1:${PORT}/health" || true)"
if [[ -z "$body" ]]; then
  crit "health unreachable"
else
  echo "$body"
  echo "$body" | grep -q '"status":"ok"' || crit "health status not ok"
  if echo "$body" | grep -q '"connected":false'; then
    crit "database.connected false"
  else
    ok "health status=ok"
  fi
fi

echo
echo "-- disk --"
# Prefer df on repo path
df_line="$(df -P . | awk 'NR==2{print $5" "$4}')"
used_pct="${df_line%%\%*}"
avail="$(echo "$df_line" | awk '{print $2}')"
echo "used_pct=${used_pct} avail_1k_blocks=${avail}"
if [[ "${used_pct}" =~ ^[0-9]+$ ]] && (( used_pct >= DISK_WARN_PCT )); then
  warn "disk used_pct=${used_pct} >= ${DISK_WARN_PCT}"
else
  ok "disk under threshold (${DISK_WARN_PCT}%)"
fi

echo
echo "-- backup age --"
latest="$(ls -1t "${BACKUP_DIR}"/postgres-*.dump 2>/dev/null | head -1 || true)"
if [[ -z "$latest" ]]; then
  warn "no postgres-*.dump in ${BACKUP_DIR}"
else
  # GNU date / BSD date best-effort
  if stat --version >/dev/null 2>&1; then
    mtime="$(stat -c %Y "$latest")"
  else
    mtime="$(stat -f %m "$latest")"
  fi
  now="$(date +%s)"
  age_h="$(awk -v n="$now" -v m="$mtime" 'BEGIN{printf "%.2f", (n-m)/3600}')"
  size="$(wc -c < "$latest" | tr -d ' ')"
  echo "latest=$(basename "$latest") age_hours=${age_h} size_bytes=${size}"
  older="$(awk -v a="$age_h" -v max="$BACKUP_MAX_AGE_HOURS" 'BEGIN{print (a>max)?1:0}')"
  if [[ "$older" == "1" ]]; then
    warn "backup older than RPO window (${BACKUP_MAX_AGE_HOURS} h)"
  else
    ok "backup within RPO window"
  fi
fi

echo
echo "-- recent api logs (ERROR/FAIL/P1000) --"
hits="$(docker compose --env-file "$ENV_FILE" logs api --tail 80 2>/dev/null | grep -Eiw 'ERROR|FAIL|P1000|EACCES|no space' || true)"
if [[ -z "$hits" ]]; then
  ok "no ERROR/FAIL/P1000 in last 80 api log lines"
else
  count="$(echo "$hits" | wc -l | tr -d ' ')"
  warn "api logs contain error patterns (${count}); sample:"
  echo "$hits" | head -5
fi

echo
echo "=== summary ==="
case "$worst" in
  0) echo "RESULT=OK" ;;
  1) echo "RESULT=WARN" ;;
  2) echo "RESULT=CRITICAL" ;;
esac
exit "$worst"
