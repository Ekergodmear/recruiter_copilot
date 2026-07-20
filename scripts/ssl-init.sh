#!/usr/bin/env bash
# Issue Let's Encrypt cert then switch nginx to TLS config.
# Prerequisites: DNS A/AAAA → this host; ports 80/443 open; DOMAIN + CERTBOT_EMAIL in .env.production
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="${ENV_FILE:-.env.production}"
# shellcheck disable=SC1090
set -a
source <(grep -E '^(DOMAIN|CERTBOT_EMAIL)=' "$ENV_FILE" || true)
set +a
DOMAIN="${DOMAIN:?Set DOMAIN in .env.production}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:?Set CERTBOT_EMAIL in .env.production}"

docker compose --env-file "$ENV_FILE" --profile proxy --profile ssl up -d
docker compose --env-file "$ENV_FILE" run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --non-interactive

# Render TLS nginx config with domain
sed "s|\${DOMAIN}|${DOMAIN}|g" deploy/nginx/nginx.conf \
  > /tmp/nginx-ssl.conf
docker compose --env-file "$ENV_FILE" cp /tmp/nginx-ssl.conf nginx:/etc/nginx/conf.d/default.conf
docker compose --env-file "$ENV_FILE" exec nginx nginx -s reload
echo "TLS enabled for https://${DOMAIN}"
