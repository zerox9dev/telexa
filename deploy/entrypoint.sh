#!/bin/sh
set -e

echo "[entrypoint] Running migrations..."
alembic upgrade head

echo "[entrypoint] Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
