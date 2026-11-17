#!/bin/bash
# Option A single-service launcher (Render / bare `docker run`).
#
# Runs the whole async stack inside ONE container so the API and the Celery
# worker share the same /tmp — the worker writes a conversion result there and
# the API serves the download by reading it back. On separate hosts/services
# that /tmp is not shared and every download 404s (see Production Analysis #18);
# co-locating them is what keeps the single-URL deploy working.
#
# NOTE: docker-compose.yml overrides `command:` for every service, so this
# script only runs on Render or a bare `docker run` of the image — never under
# compose. Local multi-container dev is unaffected.
#
# Processes:
#   - celery worker  — consumes BOTH queues (default,office) in one process
#   - celery beat    — the /tmp cleanup sweep (without it, disk fills)
#   - gunicorn       — the public API, bound to Render's $PORT
#
# Any one dying takes the container down (`wait -n`) so Render restarts the
# whole thing — no silent half-dead state where the API is up but the worker
# is gone.

set -m

GUNICORN_WORKERS="${GUNICORN_WORKERS:-2}"
CELERY_CONCURRENCY="${CELERY_CONCURRENCY:-2}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-600}"
PORT="${PORT:-8000}"

# ponytail: no in-container unoserver — office_service falls back to a direct
# `libreoffice --headless` per call when unoserver is unreachable (fails fast on
# connection-refused at 127.0.0.1:2003, the default). Slower per office
# conversion (cold LibreOffice) but zero extra moving parts / RAM. To warm it up,
# uncomment the next line AND set UNOSERVER_HOST=127.0.0.1 in the env:
# python3 -m unoserver.server --interface 127.0.0.1 --port 2003 &

celery -A celery_app.celery worker --loglevel=info -Q default,office \
  -c "$CELERY_CONCURRENCY" -n combined@%h &

celery -A celery_app.celery beat --loglevel=info &

gunicorn main:app \
  --workers "$GUNICORN_WORKERS" \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT}" \
  --timeout "$GUNICORN_TIMEOUT" &

# Exit as soon as ANY child exits, then take the rest down with us.
wait -n
echo "start.sh: a child process exited — shutting the container down for restart." >&2
kill 0
exit 1
