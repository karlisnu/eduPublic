#!/usr/bin/env bash
set -euo pipefail

if [[ -f frontend/package.json ]]; then
  npm --prefix frontend install
fi

until pg_isready -h db -U dev -d appdb >/dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "Development environment ready."