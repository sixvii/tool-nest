"""
Shared test utilities for the Celery/task-based endpoint pattern (see
context doc: dispatch -> 202 + task_id, then GET {prefix}/task/{id} polls
via routers._task_polling.poll_task_result until a file comes back).

Two things are mocked independently, matching the two things that actually
happen on a real request:

1. `<task>.delay(...)` - mocked per-router-test so we can assert a dispatch
   endpoint (a) returns 202 + a task_id and (b) calls the right task with
   the right arguments, without a real Celery worker/Redis running.
2. `celery.result.AsyncResult` - mocked (via FakeAsyncResult) so we can
   drive poll_task_result through PENDING/PROGRESS/SUCCESS/FAILURE without
   a real task having actually run.
"""


class FakeAsyncResult:
    """Stand-in for celery.result.AsyncResult with a fixed, pre-configured state."""

    def __init__(self, status="PENDING", info=None, result=None,
                 is_failed=False, is_ready=False, is_successful=False):
        self.status = status
        self.info = info
        self._result = result
        self._is_failed = is_failed
        self._is_ready = is_ready
        self._is_successful = is_successful

    def failed(self):
        return self._is_failed

    def ready(self):
        return self._is_ready

    def successful(self):
        return self._is_successful

    def get(self):
        return self._result

    @property
    def result(self):
        return self._result


def pending_result(stage=None, status="STARTED"):
    """A task that's still running. If `stage` is given, mimics _set_stage()
    having called self.update_state(state='PROGRESS', meta={'stage': stage})."""
    if stage:
        return FakeAsyncResult(status="PROGRESS", info={"stage": stage})
    return FakeAsyncResult(status=status)


def success_result(result_path, filename, content_type):
    """A finished task whose result dict matches every task in services/tasks.py:
    {"result_path": ..., "filename": ..., "content_type": ...}."""
    return FakeAsyncResult(
        status="SUCCESS",
        is_ready=True,
        is_successful=True,
        result={"result_path": result_path, "filename": filename, "content_type": content_type},
    )


def failure_result(error="Simulated task failure"):
    return FakeAsyncResult(status="FAILURE", is_failed=True, result=error)
