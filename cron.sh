#!/bin/sh

# supercronic inherits the container environment, so no need to persist/source env vars.
cat > /tmp/crontab << 'CRONTAB'
*/2 * * * * curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" -w "\n[cron] sync-results HTTP: %{http_code}\n" "$APP_URL/api/sync-results"
*/30 * * * * curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" -w "\n[cron] sync-fixtures HTTP: %{http_code}\n" "$APP_URL/api/sync-fixtures"
CRONTAB

echo "[cron] iniciando supercronic..."
exec supercronic --quiet /tmp/crontab
