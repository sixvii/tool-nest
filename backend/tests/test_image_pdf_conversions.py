import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from tests.task_test_utils import success_result

client = TestClient(app)

@pytest.mark.parametrize("endpoint, filename", [
    ("/api/convert/image-pdf/images-to-pdf", "img.jpg"),
    ("/api/convert/image-pdf/heic-to-pdf", "img.heic"),
    ("/api/convert/image-pdf/eps-to-pdf", "img.eps"),
])
@patch('routers.image_pdf_conversions.image_pdf_service')
def test_multiple_images_to_pdf_conversions(mock_service, endpoint, filename):
    fd, fake_out_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd) 
    
    method_name = endpoint.split("/")[-1].replace("-", "_")
    getattr(mock_service, method_name).return_value = fake_out_path
    
    files = [
        ("files", (filename, b"fake_image_bytes_1", "application/octet-stream")),
        ("files", (filename, b"fake_image_bytes_2", "application/octet-stream"))
    ]
    
    response = client.post(endpoint, files=files)
    assert response.status_code == 200
    assert "pdf" in response.headers.get("content-type", "")
    
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)

@pytest.mark.parametrize("endpoint, output_format", [
    ("/api/convert/image-pdf/pdf-to-jpg", "jpg"),
    ("/api/convert/image-pdf/pdf-to-png", "png"),
    ("/api/convert/image-pdf/pdf-to-tiff", "tiff"),
])
@patch('routers.image_pdf_conversions.convert_pdf_to_images_task')
def test_pdf_to_images_dispatches_task(mock_task, endpoint, output_format):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    response = client.post(endpoint, files={"file": ("doc.pdf", b"fake_pdf_bytes", "application/pdf")})
    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    assert mock_task.delay.call_args.kwargs["output_format"] == output_format


@patch('routers.image_pdf_conversions.convert_pdf_to_images_task')
def test_pdf_to_images_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    response = client.post("/api/convert/image-pdf/pdf-to-jpg", files={"file": ("doc.pdf", b"fake_pdf_bytes", "application/pdf")})
    assert response.status_code == 500


@patch('routers._task_polling.AsyncResult')
def test_image_pdf_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    fd, path = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"fake zip bytes")
    try:
        mock_async_result.return_value = success_result(path, "pages.zip", "application/zip")
        response = client.get("/api/convert/image-pdf/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
    finally:
        if os.path.exists(path):
            os.remove(path)