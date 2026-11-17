import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)


@pytest.mark.parametrize("endpoint, form_data, filename, expected_suffix", [
    ("/api/file/csv-to-excel", None, "data.csv", ".xlsx"),
    ("/api/file/excel-to-csv", None, "data.xlsx", ".zip"),
    ("/api/file/split-csv", {"rows_per_file": 100}, "data.csv", ".zip"),
    ("/api/file/split-excel", {"rows_per_file": 100}, "data.xlsx", ".zip"),
])
@patch('routers.file_tools.file_service')
def test_file_tools_endpoints(mock_service, endpoint, form_data, filename, expected_suffix):
    fd, fake_out_path = tempfile.mkstemp(suffix=expected_suffix)
    os.close(fd) 
    
    method_name = endpoint.split("/")[-1].replace("-", "_")
    if method_name in ("csv_to_excel", "excel_to_csv"):
        method_name = "convert_" + method_name
    getattr(mock_service, method_name).return_value = fake_out_path
    
    files = {"file": (filename, b"fake_file_bytes", "application/octet-stream")}
    response = client.post(endpoint, files=files, data=form_data) if form_data else client.post(endpoint, files=files)
        
    assert response.status_code == 200
    
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)

@pytest.mark.parametrize("endpoint, form_data, filename", [
    ("/api/file/csv-to-excel", None, "data.csv"),
    ("/api/file/excel-to-csv", None, "data.xlsx"),
    ("/api/file/split-csv", {"rows_per_file": 100}, "data.csv"),
    ("/api/file/split-excel", {"rows_per_file": 100}, "data.xlsx"),
])
@patch('routers.file_tools.file_service')
def test_file_tools_exceptions(mock_service, endpoint, form_data, filename):
    method_name = endpoint.split("/")[-1].replace("-", "_")
    if method_name in ("csv_to_excel", "excel_to_csv"):
        method_name = "convert_" + method_name
    getattr(mock_service, method_name).side_effect = Exception("Mocked error")
    files = {"file": (filename, b"fake_file_bytes", "application/octet-stream")}
    response = client.post(endpoint, files=files, data=form_data) if form_data else client.post(endpoint, files=files)
    assert response.status_code == 500