#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

run_step() {
  local name="$1"
  shift
  printf '\n==> %s\n' "$name"
  "$@"
}

validate_runtime_versions() {
  node --version
  npm --version
  test "$(node --version | cut -d. -f1)" = "v22"
}

validate_frontend_package() {
  npm --prefix frontend install --offline --ignore-scripts
}

validate_setup_script() {
  bash -n .devcontainer/setup.sh
}

validate_devcontainer_json() {
  node -e "JSON.parse(require('fs').readFileSync('.devcontainer/devcontainer.json', 'utf8'))"
}

validate_mysql_connectivity() {
  command -v mysql >/dev/null
  MYSQL_PWD="${MYSQL_PWD:-dev}" mysql --protocol=tcp -h 127.0.0.1 -u dev appdb -e "SELECT 1;"
}

validate_backend_checks() {
  node backend/scripts/check-ci-bypasses.js
  npm --prefix backend run test:ci
}

validate_database_migrations() {
  npm --prefix backend run db:migrate
  npm --prefix backend run ci:smoke
}

validate_frontend_build() {
  npm --prefix frontend run build
}

validate_required_project_files() {
  local file
  for file in \
    .devcontainer/devcontainer.json \
    .devcontainer/docker-compose.yml \
    .github/pull_request_template.md \
    .github/ISSUE_TEMPLATE/project_proposal.md \
    docs/pair-log.md \
    docs/architecture.md \
    docs/week1-verification.md; do
    test -f "$file"
  done
}

run_step "Validate runtime versions (Node.js 22 required)" validate_runtime_versions
run_step "Install frontend dependencies from the local npm cache" validate_frontend_package
run_step "Validate setup script syntax" validate_setup_script
run_step "Validate Dev Container JSON" validate_devcontainer_json
run_step "Validate MySQL connectivity" validate_mysql_connectivity
run_step "Run backend coverage, test-count, and bypass checks" validate_backend_checks
run_step "Apply migrations and verify the MySQL-backed API" validate_database_migrations
run_step "Build frontend" validate_frontend_build
run_step "Validate required project files" validate_required_project_files

printf '\nAll locally available CI checks passed. Secret scanning and npm audit run in GitHub Actions.\n'
