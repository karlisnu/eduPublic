#!/usr/bin/env bash
set -euo pipefail

git config --global --add safe.directory /workspace

if [[ -f frontend/package.json ]]; then
  npm --prefix frontend install
fi

node --version
npm --version

for attempt in {1..60}; do
  if mysqladmin ping -h db -u dev -pdev --silent >/dev/null 2>&1; then
    mysql -h db -u dev -pdev appdb -e "SELECT 1;" >/dev/null
    if [[ -f backend/sql/schema.sql ]]; then
      mysql -h db -u dev -pdev appdb < backend/sql/schema.sql
    fi
    echo "Development environment ready."
    exit 0
  fi

  echo "Waiting for MySQL..."
  sleep 2
done

echo "MySQL did not become available after 120 seconds." >&2
exit 1