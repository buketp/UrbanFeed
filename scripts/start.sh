#!/bin/bash
set -euo pipefail

echo "[start.sh] starting..."

# Ensure .pgdata directory ownership
if [ -d ".pgdata" ]; then
  chown -R $(whoami):$(whoami) .pgdata
fi

PGDATA="$HOME/pgdata"
PGLOG="$HOME/pg.log"

# 1) İlk kurulum
if [ ! -d "$PGDATA/base" ]; then
  echo "[start.sh] initdb..."
  initdb -D "$PGDATA" -U postgres -A password --pwfile=<(echo password) >/dev/null
fi

# 2) Postgres çalışmıyorsa başlat
if ! pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
  echo "[start.sh] pg_ctl start..."
  pg_ctl -D "$PGDATA" -l "$PGLOG" -o "-k $HOME -p 5432" start
fi

# 3) Hazır olana kadar bekle
echo "[start.sh] waiting pg_isready..."
until pg_isready -q -h "$HOME" -p 5432 -U postgres; do
  sleep 0.5
done

# 4) Veritabanı yoksa oluştur
echo "[start.sh] ensure database..."
export PGPASSWORD=password
psql "postgresql://postgres:password@127.0.0.1:5432/postgres?sslmode=disable" \
  -tAc "SELECT 1 FROM pg_database WHERE datname='pressdb'" | grep -q 1 || \
  createdb -h 127.0.0.1 -p 5432 -U postgres pressdb

# 5) Migration (migrate.js, scripts/migrate.js ya da schema.sql)
echo "[start.sh] migration..."
if [ -f "./scripts/migrate.js" ]; then
  node ./scripts/migrate.js || true
elif [ -f "./migrate.js" ]; then
  node ./migrate.js || true
elif [ -f "./schema.sql" ]; then
  psql "postgresql://postgres:password@127.0.0.1:5432/pressdb?sslmode=disable" -f ./schema.sql || true
else
  echo "[start.sh] no migration file found (ok)"
fi

# 6) Uygulama
echo "[start.sh] starting node..."
export PORT=3000
exec node index.js