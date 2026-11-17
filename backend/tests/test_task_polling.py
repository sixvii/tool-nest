"""
Tests for routers/_task_polling.py's poll_task_result — the single shared
function every converted router's own /task/{id} endpoint delegates to
(video, office, ebook, audio, web, image, image-pdf, pdf, structured-data).

Testing it thoroughly once here means each router's own test file only
needs to prove it's wired up correctly (see e.g. test_video_tools.py's
`test_task_endpoint_delegates_to_poll_task_result`), not re-prove every
state transition per router.
"""
import os
import tempfile
from unittest.mock import patch
from fastapi import BackgroundTasks

from routers._task_polling import poll_task_result
from tests.task_test_utils import pending_result, success_result, failure_result


@patch('routers._task_polling.AsyncResult')
def test_pending_returns_200_with_bare_status(mock_async_result):
    mock_async_result.return_value = pending_result(status="STARTED")
    response = poll_task_result("task-1", BackgroundTasks())
    assert response.status_code == 200
    assert response.body == b'{"status":"STARTED"}' or b'"status":"STARTED"' in response.body


@patch('routers._task_polling.AsyncResult')
def test_pending_with_stage_forwards_meta(mock_async_result):
    """This is the whole point of _set_stage(): PROGRESS state should carry
    {"stage": "..."} through to the client, not just a bare status string."""
    mock_async_result.return_value = pending_result(stage="converting")
    response = poll_task_result("task-1", BackgroundTasks())
    assert response.status_code == 200
    assert b'"status":"PROGRESS"' in response.body
    assert b'"stage":"converting"' in response.body


@patch('routers._task_polling.AsyncResult')
def test_success_returns_file_response(mock_async_result):
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"fake pdf bytes")

    try:
        mock_async_result.return_value = success_result(path, "result.pdf", "application/pdf")
        response = poll_task_result("task-1", BackgroundTasks())
        assert response.status_code == 200
        assert response.media_type == "application/pdf"
        assert response.path == path
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('routers._task_polling.AsyncResult')
def test_success_but_missing_file_returns_404(mock_async_result):
    mock_async_result.return_value = success_result("/tmp/does-not-exist-at-all.pdf", "x.pdf", "application/pdf")
    response = poll_task_result("task-1", BackgroundTasks())
    assert response.status_code == 404


@patch('routers._task_polling.AsyncResult')
def test_failure_returns_500(mock_async_result):
    mock_async_result.return_value = failure_result("boom")
    response = poll_task_result("task-1", BackgroundTasks())
    assert response.status_code == 500
    assert b'"status":"FAILURE"' in response.body


@patch('routers._task_polling.AsyncResult')
def test_success_schedules_cleanup_by_default(mock_async_result):
    """Per the backend context doc: output files are only deleted after a
    successful poll downloads them. Verify that cleanup task is scheduled."""
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"fake pdf bytes")

    try:
        mock_async_result.return_value = success_result(path, "result.pdf", "application/pdf")
        bg = BackgroundTasks()
        poll_task_result("task-1", bg)
        assert len(bg.tasks) == 1
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('routers._task_polling.AsyncResult')
def test_success_skips_cleanup_when_disabled(mock_async_result):
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"fake pdf bytes")

    try:
        mock_async_result.return_value = success_result(path, "result.pdf", "application/pdf")
        bg = BackgroundTasks()
        poll_task_result("task-1", bg, cleanup=False)
        assert len(bg.tasks) == 0
    finally:
        if os.path.exists(path):
            os.remove(path)
