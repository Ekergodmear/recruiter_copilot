#!/bin/sh
set -e

echo "[entrypoint] Applying Prisma migrations (migrate deploy)…"
node /app/prisma-cli.js migrate deploy

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Running db seed…"
  node /app/prisma/seed.mjs || true
fi

echo "[entrypoint] Starting API on port ${PORT:-3000}…"
exec node dist/src/app/server.js
