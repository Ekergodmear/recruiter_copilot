#!/usr/bin/env bash
# Wrapper — see scripts/backup/backup.sh
exec "$(cd "$(dirname "$0")" && pwd)/backup/backup.sh" "$@"
