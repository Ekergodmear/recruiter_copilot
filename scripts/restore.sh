#!/usr/bin/env bash
# Wrapper — see scripts/backup/restore.sh
exec "$(cd "$(dirname "$0")" && pwd)/backup/restore.sh" "$@"
