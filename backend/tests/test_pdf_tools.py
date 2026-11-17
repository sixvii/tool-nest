import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from tests.task_test_utils import success_result
import tempfile
import os
from main import app

client = TestClient(app)
@pytest.mark.parametrize("endpoint, form_data", [
    ("/api/pdf/split", {"page_ranges": "0-2"}),
    ("/api/pdf/rotate", {"degrees": 90, "page_ranges": "0"}),
    ("/api/pdf/rearrange", {"page_indices": "2,0,1"}),
    ("/api/pdf/delete-pages", {"pages": "0,2"}),
    ("/api/pdf/crop", {"x_percent": 0, "y_percent": 0, "width_percent": 50, "height_percent": 100}),
    ("/api/pdf/resize", {"width": 595, "height": 842}),
    ("/api/pdf/protect", {"password": "test"}),
    ("/api/pdf/unlock", {"password": "test"}),
    ("/api/pdf/watermark", {"text": "DRAFT"}),
    ("/api/pdf/edit", {"elements": '[{"type": "text", "text": "hello", "x": 10, "y": 10, "page_index": 0}]'}),
    ("/api/pdf/replace-text", {"search_text": "old", "replace_text": "new", "mode": "single", "match_index": 1}),
    ("/api/pdf/esign", {"x": 10, "y": 10}),
    ("/api/pdf/parse", {}), 
])
@patch('routers.pdf.pdf_service')
def test_pdf_tools_endpoints(mock_service, endpoint, form_data):
    fd, fake_out_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd) 
    
    method_name = endpoint.split("/")[-1].replace("-", "_")
    getattr(mock_service, method_name + "_pdf").return_value = fake_out_path
    
    files = {"file": ("doc.pdf", b"fake_bytes", "application/pdf")}
    response = client.post(endpoint, files=files, data=form_data)
    
    assert response.status_code == 200
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)


# /api/pdf/compress is Celery-backed (see backend context doc) — dispatch +
# poll, not a direct sync call to pdf_service.
@patch('routers.pdf.compress_pdf_task')
def test_compress_pdf_dispatches_task(mock_task):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    files = {"file": ("doc.pdf", b"%PDF-1.7\nfake body", "application/pdf")}
    response = client.post("/api/pdf/compress", files=files, data={"compression_level": 4})
    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    assert mock_task.delay.call_args.kwargs["compression_level"] == 4


@patch('routers.pdf.compress_pdf_task')
def test_compress_pdf_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("doc.pdf", b"%PDF-1.7\nfake body", "application/pdf")}
    response = client.post("/api/pdf/compress", files=files, data={"compression_level": 4})
    assert response.status_code == 500


@patch('routers.pdf.compress_pdf_task')
def test_compress_pdf_rejects_non_pdf_before_dispatch(mock_task):
    # A file that doesn't carry the %PDF header must be rejected with 400 and
    # never reach Ghostscript (malicious-document RCE surface).
    files = {"file": ("evil.pdf", b"GIF89a not really a pdf", "application/pdf")}
    response = client.post("/api/pdf/compress", files=files, data={"compression_level": 4})
    assert response.status_code == 400
    assert "not a valid PDF" in response.json()["detail"]
    mock_task.delay.assert_not_called()


@patch('routers._task_polling.AsyncResult')
def test_compress_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"compressed pdf bytes")
    try:
        mock_async_result.return_value = success_result(path, "compressed.pdf", "application/pdf")
        response = client.get("/api/pdf/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
    finally:
        if os.path.exists(path):
            os.remove(path)



@patch('routers.pdf.pdf_service')
def test_pdf_merge_and_extract(mock_service):
    fd1, fake_merge_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd1)

    fd2, fake_extract_path = tempfile.mkstemp(suffix=".zip")
    os.close(fd2)

    mock_service.merge_pdfs.return_value = fake_merge_path
    mock_service.extract_images_pdf.return_value = fake_extract_path
    files = [("files", ("doc1.pdf", b"fake_bytes", "application/pdf")), ("files", ("doc2.pdf", b"fake_bytes", "application/pdf"))]
    assert client.post("/api/pdf/merge", files=files).status_code == 200
    assert client.post("/api/pdf/extract-images", files={"file": ("doc.pdf", b"fake_bytes", "application/pdf")}).status_code == 200
    if os.path.exists(fake_merge_path):
        os.remove(fake_merge_path)
    if os.path.exists(fake_extract_path):
        os.remove(fake_extract_path)