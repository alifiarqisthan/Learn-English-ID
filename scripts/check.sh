#!/usr/bin/env bash
# Verify that Postgres, API, and Web are reachable.
# Exit 0 if all healthy, non-zero otherwise.

set -u

API_URL="${API_URL:-http://localhost:4000/health}"
WEB_URL="${WEB_URL:-http://localhost:5173}"
DB_CONTAINER="${DB_CONTAINER:-learn-english-id-db}"

ok=0
fail=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
gray()  { printf "\033[90m%s\033[0m\n" "$1"; }

check() {
  local name="$1"
  local cmd="$2"
  printf "  %-12s " "$name"
  if eval "$cmd" >/dev/null 2>&1; then
    green "OK"
    ok=$((ok + 1))
  else
    red "DOWN"
    fail=$((fail + 1))
  fi
}

echo "Checking learn-english-id services..."
gray "  api:  $API_URL"
gray "  web:  $WEB_URL"
gray "  db:   container '$DB_CONTAINER'"
echo ""

check "postgres" "docker ps --filter name=^/${DB_CONTAINER}\$ --filter status=running --format '{{.Names}}' | grep -q ."
check "api"      "curl -fsS --max-time 2 '$API_URL'"
check "web"      "curl -fsS --max-time 2 '$WEB_URL'"

echo ""
if [ "$fail" -eq 0 ]; then
  green "All services up ($ok/$((ok + fail)))"
  exit 0
else
  red "$fail service(s) down — run ./scripts/start.sh"
  exit 1
fi
