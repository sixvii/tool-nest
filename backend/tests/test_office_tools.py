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


# valid magic per input type so the boundary validators pass
_ZIP = b"PK\x03\x04" + b"\x00" * 20          # OOXML docx/pptx
_OLE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 20  # legacy OLE / .msg
_PDF = b"%PDF-1.7\nfake body"


@pytest.mark.parametrize("endpoint, filename, operation, body", [
    ("/api/convert/office/word-to-pdf", "doc.docx", "word-to-pdf", _ZIP),
    ("/api/convert/office/ppt-to-pdf", "pres.pptx", "ppt-to-pdf", _ZIP),
    ("/api/convert/office/msg-to-pdf", "email.msg", "msg-to-pdf", _OLE),
    ("/api/convert/office/eml-to-pdf", "email.eml", "eml-to-pdf", b"From: a@b\n\nhi"),
    ("/api/convert/office/pdf-to-word", "doc.pdf", "pdf-to-word", _PDF),
    ("/api/convert/office/pdf-to-ppt", "doc.pdf", "pdf-to-ppt", _PDF),
])
@patch('routers.office_conversions.convert_office_document')
def test_dispatches_task_and_returns_202(mock_task, endpoint, filename, operation, body):
    mock_task.delay.return_value = _fake_task()
    files = {"file": (filename, body, "application/octet-stream")}

    response = client.post(endpoint, files=files)

    assert response.status_code == 202
    resp_body = response.json()
    assert resp_body["success"] is True
    assert resp_body["task_id"] == "fake-task-id"
    mock_task.delay.assert_called_once_with(
        operation=operation, input_path=mock_task.delay.call_args.kwargs["input_path"], original_filename=filename
    )


@pytest.mark.parametrize("endpoint", [
    "/api/convert/office/word-to-pdf",
    "/api/convert/office/ppt-to-pdf",
    "/api/convert/office/msg-to-pdf",
    "/api/convert/office/pdf-to-word",
    "/api/convert/office/pdf-to-ppt",
])
@patch('routers.office_conversions.convert_office_document')
def test_rejects_wrong_input_type(mock_task, endpoint):
    # neither an Office document nor a PDF -> 400 before LibreOffice/msgconvert
    files = {"file": ("evil.docx", b"\x89PNG not a document", "application/octet-stream")}
    response = client.post(endpoint, files=files)
    assert response.status_code == 400
    mock_task.delay.assert_not_called()


@patch('routers.office_conversions.convert_office_document')
def test_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("doc.docx", _ZIP, "application/octet-stream")}
    response = client.post("/api/convert/office/word-to-pdf", files=files)
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
        response = client.get("/api/convert/office/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    finally:
        if os.path.exists(path):
            os.remove(path)
