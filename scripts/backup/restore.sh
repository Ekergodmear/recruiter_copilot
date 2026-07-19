#!/usr/bin/env bash
# TECH-006 WP-1 — PostgreSQL restore (Docker Compose, local dump file)
# Usage: ./scripts/backup/restore.sh backups/postgres-....dump
# WARNING: replaces database contents. Stops API during restore.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE=(docker compose --env-file "$ENV_FILE")
DUMP="${1:-}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <path-to-.dump>" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
POSTGRES_USER="${POSTGRES_USER:-recruiter}"
POSTGRES_DB="${POSTGRES_DB:-recruiter_copilot}"

BYTES="$(wc -c < "$DUMP" | tr -d ' ')"
if [[ "$BYTES" -lt 100 ]]; then
  echo "Refuse restore: dump too small (${BYTES} bytes)" >&2
  exit 1
fi

echo "==> Pre-check dump listing"
docker run --rm -i postgres:16-alpine pg_restore -l < "$DUMP" >/dev/null

echo "==> Stop API (avoid open connections)"
"${COMPOSE[@]}" stop api

REMOTE="/tmp/restore-$(basename "$DUMP")"
echo "==> Copy dump into postgres container"
"${COMPOSE[@]}" cp "$DUMP" "postgres:${REMOTE}"

echo "==> Recreate database ${POSTGRES_DB}"
"${COMPOSE[@]}" exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" \
  -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"

echo "==> pg_restore"
"${COMPOSE[@]}" exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl "$REMOTE"

"${COMPOSE[@]}" exec -T postgres rm -f "$REMOTE"

echo "==> Start API"
"${COMPOSE[@]}" start api

echo "==> Wait for API health"
for i in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT:-3000}/health" | grep -q '"status":"ok"'; then
    echo "==> Restore OK — /health status=ok"
    exit 0
  fi
  sleep 2
done

echo "Restore finished but /health did not become ok within timeout" >&2
exit 1
