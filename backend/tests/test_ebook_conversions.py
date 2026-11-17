import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from tests.task_test_utils import success_result

client = TestClient(app)


def _fake_task(task_id="fake-task-id"):
    task = MagicMock()
    task.id = task_id
    return task


@pytest.mark.parametrize("endpoint, output_ext", [
    ("/api/convert/ebook/epub-to-pdf", "pdf"),
    ("/api/convert/ebook/pdf-to-epub", "epub"),
    ("/api/convert/ebook/mobi-to-pdf", "pdf"),
    ("/api/convert/ebook/pdf-to-mobi", "mobi"),
    ("/api/convert/ebook/azw3-to-pdf", "pdf"),
    ("/api/convert/ebook/pdf-to-azw3", "azw3"),
])
@patch('routers.ebook_conversions.convert_ebook_task')
def test_dispatches_task_and_returns_202(mock_task, endpoint, output_ext):
    mock_task.delay.return_value = _fake_task()
    files = {"file": ("doc.epub", b"fake_bytes", "application/octet-stream")}

    response = client.post(endpoint, files=files)

    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    assert mock_task.delay.call_args.kwargs["output_ext"] == output_ext


@patch('routers.ebook_conversions.convert_ebook_task')
def test_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("doc.epub", b"fake_bytes", "application/octet-stream")}
    response = client.post("/api/convert/ebook/epub-to-pdf", files=files)
    assert response.status_code == 500


@patch('routers._task_polling.AsyncResult')
def test_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    import tempfile
    import os
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"converted pdf bytes")

    try:
        mock_async_result.return_value = success_result(path, "out.pdf", "application/pdf")
        response = client.get("/api/convert/ebook/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    finally:
        if os.path.exists(path):
            os.remove(path)
