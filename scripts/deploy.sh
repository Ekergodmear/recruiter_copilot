#!/usr/bin/env bash
# Founder Alpha — deploy with Docker Compose
# Usage: ./scripts/deploy.sh
# Does NOT overwrite local .env (dev). Uses .env.production.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Recruiter Copilot production deploy"

if [[ ! -f .env.production ]]; then
  if [[ -f .env.production.example ]]; then
    cp .env.production.example .env.production
    echo "Created .env.production from example — edit POSTGRES_PASSWORD before public use."
  else
    echo "Missing .env.production and .env.production.example" >&2
    exit 1
  fi
fi

echo "==> docker compose --env-file .env.production up -d --build"
docker compose --env-file .env.production up -d --build

echo "==> Status"
docker compose --env-file .env.production ps

echo ""
echo "API health: http://localhost:3000/health"
echo "Logs:       docker compose --env-file .env.production logs -f api"
echo "Stop:       docker compose --env-file .env.production down"
