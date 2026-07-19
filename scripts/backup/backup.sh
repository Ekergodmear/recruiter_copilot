#!/usr/bin/env bash
# TECH-006 WP-1 — PostgreSQL backup (Docker Compose, local files only)
# Usage: ./scripts/backup/backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
KEEP="${BACKUP_KEEP:-7}"
COMPOSE=(docker compose --env-file "$ENV_FILE")

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.production.example" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# Prefer grep for keys we need (avoid sourcing secrets into unrelated vars carelessly)
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
set +a
POSTGRES_USER="${POSTGRES_USER:-recruiter}"
POSTGRES_DB="${POSTGRES_DB:-recruiter_copilot}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_NAME="postgres-${POSTGRES_DB}-${STAMP}.dump"
REMOTE="/tmp/${OUT_NAME}"
LOCAL="${BACKUP_DIR}/${OUT_NAME}"

echo "==> Backup Postgres (${POSTGRES_DB}) via compose service postgres"
"${COMPOSE[@]}" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --file="$REMOTE"

"${COMPOSE[@]}" cp "postgres:${REMOTE}" "$LOCAL"
"${COMPOSE[@]}" exec -T postgres rm -f "$REMOTE"

# Verify: non-empty + pg_restore listing
BYTES="$(wc -c < "$LOCAL" | tr -d ' ')"
if [[ "$BYTES" -lt 100 ]]; then
  echo "Backup verification failed: file too small (${BYTES} bytes)" >&2
  exit 1
fi

echo "==> Verify archive listing (pg_restore -l)"
docker run --rm -i postgres:16-alpine pg_restore -l < "$LOCAL" >/tmp/pg_restore_list.$$
LINES="$(wc -l < /tmp/pg_restore_list.$$ | tr -d ' ')"
rm -f /tmp/pg_restore_list.$$
if [[ "$LINES" -lt 1 ]]; then
  echo "Backup verification failed: empty pg_restore listing" >&2
  exit 1
fi

# Retention: keep newest KEEP dumps
echo "==> Retention KEEP=${KEEP}"
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/postgres-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" || true)
for f in "${OLD[@]:-}"; do
  [[ -n "$f" ]] || continue
  echo "    prune $f"
  rm -f "$f"
done

echo "==> OK ${LOCAL} (${BYTES} bytes, ${LINES} toc lines)"
echo "$LOCAL"
