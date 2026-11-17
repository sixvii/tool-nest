import os
from celery import Celery

# Redirect all unqualified tempfile output into one swept scratch dir, in the
# worker processes too (see services/scratch.py). Imported for its side effect.
from services import scratch  # noqa: F401

celery = Celery(
    __name__,
    broker=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

celery.autodiscover_tasks(packages=['services'])

# Reliability guardrails on the job layer:
# - time limits: a stuck ffmpeg/LibreOffice/Playwright/OCR job is killed instead
#   of holding a worker slot forever. These sit ABOVE the longest per-subprocess
#   timeout in the services (600s), so a normal-but-slow conversion still fails
#   cleanly via its own subprocess timeout; the task limit is only the backstop
#   for a job that hangs *outside* a guarded subprocess (e.g. a call that forgot
#   its own timeout). soft raises SoftTimeLimitExceeded (lets the task clean up);
#   hard is the SIGKILL backstop shortly after. Both are well under Redis's
#   default 3600s visibility timeout, so acks_late can't cause double-delivery.
# - acks_late + reject_on_worker_lost: the message is ack'd only after the task
#   finishes, so a worker that dies mid-job requeues the task instead of losing
#   it silently. Safe here because every task writes a fresh temp output (no
#   partial-state corruption on re-run). A time-limit kill is a normal failure,
#   NOT a requeue — so a legitimately-too-long job fails once, it doesn't loop.
# - result_expires: task-result metadata in the Redis backend is reaped after an
#   hour (matches the temp-file TTL) instead of growing unbounded.
CONVERSION_SOFT_TIME_LIMIT = int(os.environ.get("CELERY_SOFT_TIME_LIMIT", 600))
CONVERSION_HARD_TIME_LIMIT = int(os.environ.get("CELERY_HARD_TIME_LIMIT", 660))

celery.conf.update(
    task_track_started=True,
    task_soft_time_limit=CONVERSION_SOFT_TIME_LIMIT,
    task_time_limit=CONVERSION_HARD_TIME_LIMIT,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    result_expires=int(os.environ.get("CELERY_RESULT_EXPIRES", 3600)),
    # Recycle prefork children so leaked RAM (Pillow/PyMuPDF/ffmpeg/uno bindings
    # accumulate in the long-lived process and never release it) can't grow
    # unbounded under sustained load. Restart a child after N tasks OR when its
    # RSS crosses the ceiling — whichever comes first. Without these, a stress
    # run walks every worker up to host-OOM.
    worker_max_tasks_per_child=int(os.environ.get("CELERY_MAX_TASKS_PER_CHILD", 50)),
    worker_max_memory_per_child=int(os.environ.get("CELERY_MAX_MEMORY_PER_CHILD_KB", 400_000)),
)


celery.conf.task_default_queue = "default"

celery.conf.task_routes = {
    "services.tasks.convert_office_document": {"queue": "office"},
    "services.tasks.convert_word_to_pdf": {"queue": "office"},
}

CLEANUP_INTERVAL_SECONDS = int(os.environ.get("TEMP_FILE_CLEANUP_INTERVAL_SECONDS", 30 * 60))

celery.conf.beat_schedule = {
    "cleanup-stale-temp-files": {
        "task": "services.tasks.cleanup_stale_files",
        "schedule": CLEANUP_INTERVAL_SECONDS,
    },
}
