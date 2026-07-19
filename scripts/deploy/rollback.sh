#!/usr/bin/env bash
# TECH-006 WP-3 — Rollback (image | git)
# Usage: ./scripts/deploy/rollback.sh image
#        ./scripts/deploy/rollback.sh git founder-alpha-1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-image}"
TARGET="${2:-founder-alpha-1}"
ENV_FILE="${ENV_FILE:-.env.production}"
PORT="${PORT:-3000}"
COMPOSE=(docker compose --env-file "$ENV_FILE")
IMAGE_LOCAL="aiheadhunter-api"
PREVIOUS_TAG="${IMAGE_LOCAL}:previous"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE" >&2; exit 1; }

wait_health() {
  for i in $(seq 1 36); do
    if curl -sf "http://127.0.0.1:${PORT}/health" | grep -q '"status":"ok"'; then
      echo "==> Health OK"
      curl -s "http://127.0.0.1:${PORT}/health"
      echo
      return 0
    fi
    sleep 5
  done
  echo "Rollback finished but /health not ok" >&2
  exit 1
}

if [[ "$MODE" == "image" ]]; then
  PREV_ID="$(docker images -q "$PREVIOUS_TAG" | head -1 || true)"
  [[ -n "$PREV_ID" ]] || { echo "No local tag $PREVIOUS_TAG. Run update.sh first, or use git mode." >&2; exit 1; }
  echo "==> Image rollback: retag $PREVIOUS_TAG -> ${IMAGE_LOCAL}:latest"
  docker tag "$PREVIOUS_TAG" "${IMAGE_LOCAL}:latest"
  echo "==> Recreate api from local image (no build)"
  "${COMPOSE[@]}" up -d --no-build api
  wait_health
  "${COMPOSE[@]}" ps
  exit 0
fi

if [[ "$MODE" == "git" ]]; then
  git rev-parse --verify "${TARGET}^{commit}" >/dev/null
  echo "==> Git rollback to $TARGET"
  echo "WARNING: This checks out $TARGET in the working tree."
  git checkout "$TARGET"
  "${COMPOSE[@]}" up -d --build
  wait_health
  "${COMPOSE[@]}" ps
  echo "When incident is over: git checkout main && git pull origin main"
  exit 0
fi

echo "Usage: $0 image | git [target]" >&2
exit 1
