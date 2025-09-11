#!/bin/bash
set -euo pipefail

echo "[start.sh] starting with Replit managed PostgreSQL..."

# Use Replit managed PostgreSQL - construct DATABASE_URL
echo "[start.sh] using Replit managed database: ${PGDATABASE}@${PGHOST}"
export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=disable"

# 5) Migration (migrate.js, scripts/migrate.js ya da schema.sql)
echo "[start.sh] migration..."
if [ -f "./scripts/migrate.js" ]; then
  node ./scripts/migrate.js || true
elif [ -f "./migrate.js" ]; then
  node ./migrate.js || true
elif [ -f "./schema.sql" ]; then
  psql "${DATABASE_URL}" -f ./schema.sql || true
else
  echo "[start.sh] no migration file found (ok)"
fi

# 6) Uygulama
echo "[start.sh] starting node..."
export PORT=3000
exec node index.js