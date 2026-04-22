#!/usr/bin/env bash
# Run docker compose against repo-root docker-compose.ci.yml (Compose v2 or v1).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT/docker-compose.ci.yml"
if docker compose version &>/dev/null; then
  exec docker compose -f "$FILE" "$@"
elif command -v docker-compose &>/dev/null; then
  exec docker-compose -f "$FILE" "$@"
else
  echo "Docker Compose is required (docker compose or docker-compose)." >&2
  exit 125
fi
