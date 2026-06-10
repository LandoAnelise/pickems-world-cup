#!/bin/sh
set -e

echo "[cron] iniciando sync a cada 120s → $APP_URL"

while true; do
  echo "[cron] $(date '+%Y-%m-%d %H:%M:%S') sincronizando..."
  curl -sS -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    -w "\n[cron] status HTTP: %{http_code}\n" \
    "$APP_URL/api/sync-results"
  sleep 120
done
