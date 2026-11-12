#!/bin/sh
set -e

# Schema is created on app startup via Base.metadata.create_all() (see main.py).
echo "[entrypoint] Starting services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
