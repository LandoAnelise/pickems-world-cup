#!/bin/sh
set -e

# crond spawns jobs with a clean environment, so persist the container's
# env vars to a file that each job sources before running.
printenv > /tmp/cron.env

# Write crontab for the running user. Add more jobs below as needed.
mkdir -p /tmp/crontabs
cat > /tmp/crontabs/nextjs << 'CRONTAB'
*/2 * * * * . /tmp/cron.env; curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" -w "\n[cron] sync-results HTTP: %{http_code}\n" "$APP_URL/api/sync-results" >> /proc/1/fd/1 2>&1
*/30 * * * * . /tmp/cron.env; curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" -w "\n[cron] sync-fixtures HTTP: %{http_code}\n" "$APP_URL/api/sync-fixtures" >> /proc/1/fd/1 2>&1
CRONTAB

echo "[cron] iniciando crond"
exec crond -f -l 2 -c /tmp/crontabs
