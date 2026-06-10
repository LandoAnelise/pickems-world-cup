#!/bin/sh
set -e

while true; do
  curl -sf -X POST \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$APP_URL/api/sync-results"
  sleep 120
done
