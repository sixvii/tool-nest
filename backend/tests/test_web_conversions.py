import pytest
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient

from main import app
from tests.task_test_utils import success_result

client = TestClient(app)


def _fake_task(task_id="fake-task-id"):
    task = MagicMock()
    task.id = task_id
    return task


# The happy-path tests patch assert_public_url to a no-op so they stay
# network-free (a real https://example.com would trigger a DNS lookup) and
# focus on dispatch behaviour. The SSRF guard itself is tested separately
# below (router 400s) and in test_web_service.py (the resolver logic).
@patch('routers.web_conversions.assert_public_url')
@patch('routers.web_conversions.convert_url_to_pdf_task')
def test_url_to_pdf_dispatches_task_and_returns_202(mock_task, mock_guard):
    mock_task.delay.return_value = _fake_task()

    response = client.post("/api/convert/web/url-to-pdf", json={"url": "https://example.com"})

    assert response.status_code == 202
    body = response.json()
    assert body["success"] is True
    assert body["task_id"] == "fake-task-id"
    mock_task.delay.assert_called_once_with(url="https://example.com/")


@patch('routers.web_conversions.assert_public_url')
@patch('routers.web_conversions.convert_url_to_pdf_task')
def test_url_to_pdf_dispatch_failure_returns_500(mock_task, mock_guard):
    mock_task.delay.side_effect = Exception("broker unreachable")

    response = client.post("/api/convert/web/url-to-pdf", json={"url": "https://fail.com"})

    assert response.status_code == 500


# --- SSRF guard: internal/private targets must be rejected with 400 before
# any task is dispatched. IP literals are used so getaddrinfo needs no network.
@patch('routers.web_conversions.convert_url_to_pdf_task')
@pytest.mark.parametrize("bad_url", [
    "http://127.0.0.1/",                            # loopback
    "http://169.254.169.254/latest/meta-data/",     # cloud metadata (link-local)
    "http://10.0.0.5/",                             # private
    "http://192.168.1.1/",                          # private
    "http://[::1]/",                                # IPv6 loopback
])
def test_url_to_pdf_rejects_internal_targets(mock_task, bad_url):
    response = client.post("/api/convert/web/url-to-pdf", json={"url": bad_url})

    assert response.status_code == 400
    assert "not allowed" in response.json()["detail"]
    mock_task.delay.assert_not_called()


def test_url_to_pdf_invalid_url():
    """Pydantic validation for a malformed URL, expecting a 422 — unaffected
    by the Celery conversion since this fails before any task dispatch."""
    response = client.post("/api/convert/web/url-to-pdf", json={"url": "not-a-valid-url"})
    assert response.status_code == 422


@patch('routers._task_polling.AsyncResult')
def test_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    import tempfile
    import os
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"generated pdf bytes")

    try:
        mock_async_result.return_value = success_result(path, "website.pdf", "application/pdf")
        response = client.get("/api/convert/web/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    finally:
        if os.path.exists(path):
            os.remove(path)
