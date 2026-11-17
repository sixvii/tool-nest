import tempfile
import os
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from tests.task_test_utils import success_result

client = TestClient(app)

def test_json_to_xml():
    files = {"file": ("data.json", b'{"key": "value"}', "application/json")}
    response = client.post("/api/convert/data/json-to-xml", files=files)
    assert response.status_code == 200
    assert b"key" in response.content

def test_xml_to_json():
    files = {"file": ("data.xml", b'<data><key>value</key></data>', "application/xml")}
    response = client.post("/api/convert/data/xml-to-json", files=files)
    assert response.status_code == 200
    assert b"key" in response.content

def test_csv_to_json():
    files = {"file": ("data.csv", b'key\nvalue', "text/csv")}
    response = client.post("/api/convert/data/csv-to-json", files=files)
    assert response.status_code == 200
    assert b"key" in response.content

def test_csv_to_xml():
    files = {"file": ("data.csv", b'key\nvalue', "text/csv")}
    response = client.post("/api/convert/data/csv-to-xml", files=files)
    assert response.status_code == 200
    assert b"key" in response.content

@patch('pandas.read_xml')
def test_xml_to_excel(mock_read_xml):
    mock_read_xml.return_value.to_excel = lambda *args, **kwargs: None
    files = {"file": ("data.xml", b'<data></data>', "application/xml")}
    assert client.post("/api/convert/data/xml-to-excel", files=files).status_code == 200

@patch('pandas.read_xml')
def test_xml_to_csv(mock_read_xml):
    mock_read_xml.return_value.to_csv = lambda *args, **kwargs: None
    files = {"file": ("data.xml", b'<data></data>', "application/xml")}
    assert client.post("/api/convert/data/xml-to-csv", files=files).status_code == 200

@patch('pandas.read_excel')
def test_excel_to_xml(mock_read_excel):
    mock_read_excel.return_value.to_xml = lambda *args, **kwargs: None
    files = {"file": ("data.xlsx", b'fake_excel_bytes', "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    assert client.post("/api/convert/data/excel-to-xml", files=files).status_code == 200

@patch('routers.structured_data_tools.ocr_task')
def test_image_to_text_dispatches_task(mock_task):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    files = {"file": ("image.png", b"fake_bytes", "image/png")}
    response = client.post("/api/convert/data/image-to-text", files=files)
    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    assert mock_task.delay.call_args.kwargs["mode"] == "image"

@patch('routers.structured_data_tools.ocr_task')
def test_tiff_to_text_dispatches_task(mock_task):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    files = {"file": ("image.tiff", b"fake_bytes", "image/tiff")}
    response = client.post("/api/convert/data/tiff-to-text", files=files)
    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    assert mock_task.delay.call_args.kwargs["mode"] == "tiff"

@patch('routers._task_polling.AsyncResult')
def test_ocr_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    fd, path = tempfile.mkstemp(suffix=".txt")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"dummy text")
    try:
        mock_async_result.return_value = success_result(path, "result.txt", "text/plain")
        response = client.get("/api/convert/data/task/some-task-id")
        assert response.status_code == 200
        assert response.content == b"dummy text"
    finally:
        if os.path.exists(path):
            os.remove(path)

def test_json_to_xml_invalid():
    files = {"file": ("data.json", b'invalid_json', "application/json")}
    response = client.post("/api/convert/data/json-to-xml", files=files)
    assert response.status_code == 400

def test_xml_to_json_invalid():
    files = {"file": ("data.xml", b'invalid_xml', "application/xml")}
    response = client.post("/api/convert/data/xml-to-json", files=files)
    assert response.status_code == 400

@patch('pandas.read_xml')
def test_xml_to_excel_invalid(mock_read_xml):
    mock_read_xml.side_effect = Exception("Bad XML")
    files = {"file": ("data.xml", b'<data></data>', "application/xml")}
    assert client.post("/api/convert/data/xml-to-excel", files=files).status_code == 400

@patch('pandas.read_excel')
def test_excel_to_xml_invalid(mock_read_excel):
    mock_read_excel.side_effect = Exception("Bad Excel")
    files = {"file": ("data.xlsx", b'fake', "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    assert client.post("/api/convert/data/excel-to-xml", files=files).status_code == 400