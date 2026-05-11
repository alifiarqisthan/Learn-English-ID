#!/usr/bin/env bash
# Start Postgres, then API + web in parallel.
# Foreground: streams logs from both. Ctrl+C to stop.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
gray()  { printf "\033[90m%s\033[0m\n" "$1"; }

# 1. Postgres via docker compose
green "[1/3] Starting Postgres..."
docker compose up -d
gray "    waiting for Postgres to accept connections..."
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U app -d learn_english_id >/dev/null 2>&1; then
    gray "    ready"
    break
  fi
  sleep 1
done

# 2. Install + migrate (idempotent — quick if already done)
green "[2/3] Ensuring deps and migrations..."
if [ ! -d node_modules ]; then
  npm install
fi
npm --workspace apps/api run prisma:generate >/dev/null
npm --workspace apps/api exec -- prisma migrate deploy >/dev/null

# 3. Start API + Web together (npm-run-all -p) — Ctrl+C kills both
green "[3/3] Starting API and Web..."
gray "    api: http://localhost:4000   web: http://localhost:5173"
echo ""
exec npm run dev
