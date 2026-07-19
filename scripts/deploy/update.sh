#!/usr/bin/env bash
# TECH-006 WP-3 — Safe Compose update
# Usage: ./scripts/deploy/update.sh
#        SKIP_BACKUP=1 ./scripts/deploy/update.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
PORT="${PORT:-3000}"
HISTORY_DIR="deploy-history"
COMPOSE=(docker compose --env-file "$ENV_FILE")
IMAGE_LOCAL="aiheadhunter-api"
PREVIOUS_TAG="${IMAGE_LOCAL}:previous"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }
mkdir -p "$HISTORY_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PRE_GIT="$(git rev-parse HEAD)"
PRE_IMAGE="$(docker images -q "${IMAGE_LOCAL}:latest" | head -1 || true)"

if [[ "${SKIP_BACKUP:-}" == "1" ]]; then
  echo "==> SKIP_BACKUP=1 — no DB backup"
else
  echo "==> Pre-deploy backup (WP-1)"
  ./scripts/backup/backup.sh
fi

if [[ -n "$PRE_IMAGE" ]]; then
  echo "==> Tag current image as ${PREVIOUS_TAG}"
  docker tag "${IMAGE_LOCAL}:latest" "$PREVIOUS_TAG"
fi

cat > "${HISTORY_DIR}/pre-${STAMP}.txt" <<EOF
stamp=${STAMP}
phase=pre
git=${PRE_GIT}
image=${PRE_IMAGE}
EOF

echo "==> docker compose up -d --build"
"${COMPOSE[@]}" up -d --build

echo "==> Wait for /health"
ok=0
for i in $(seq 1 36); do
  if curl -sf "http://127.0.0.1:${PORT}/health" | grep -q '"status":"ok"'; then
    ok=1
    break
  fi
  sleep 5
done
[[ "$ok" == "1" ]] || { echo "Update finished but /health not ok" >&2; exit 1; }

POST_GIT="$(git rev-parse HEAD)"
POST_IMAGE="$(docker images -q "${IMAGE_LOCAL}:latest" | head -1 || true)"
cat > "${HISTORY_DIR}/post-${STAMP}.txt" <<EOF
stamp=${STAMP}
phase=post
git=${POST_GIT}
image=${POST_IMAGE}
health_ok=true
EOF

echo "==> Update OK"
curl -s "http://127.0.0.1:${PORT}/health"
echo
"${COMPOSE[@]}" ps
