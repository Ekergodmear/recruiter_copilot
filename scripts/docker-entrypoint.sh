#!/bin/sh
set -e

# TODO(Alpha only): prisma db push on startup is acceptable for Founder Alpha.
# Replace with `prisma migrate deploy` before Beta. Do not keep db push in production long-term.
echo "[entrypoint] Waiting for database schema (prisma db push — Alpha only)…"
node /app/prisma-cli.js db push --skip-generate

echo "[entrypoint] Starting API on port ${PORT:-3000}…"
exec node dist/src/app/server.js
