import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)

@pytest.mark.parametrize("endpoint, method_name, expected_suffix", [
    ("/api/convert/pdf-data/pdf-to-text", "extract_text_from_pdf", ".txt"),
    ("/api/convert/pdf-data/pdf-to-csv", "extract_csv_from_pdf", ".csv"),
    ("/api/convert/pdf-data/pdf-to-excel", "extract_excel_from_pdf", ".xlsx"),
])
@patch('routers.pdf_data_extraction.pdf_data_service')
def test_pdf_data_extraction(mock_service, endpoint, method_name, expected_suffix):
    fd, fake_out_path = tempfile.mkstemp(suffix=expected_suffix)
    os.close(fd) 
    getattr(mock_service, method_name).return_value = fake_out_path
    files = {"file": ("doc.pdf", b"fake_bytes", "application/pdf")}
    assert client.post(endpoint, files=files).status_code == 200
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)

@pytest.mark.parametrize("endpoint, method_name", [
    ("/api/convert/pdf-data/pdf-to-csv", "extract_csv_from_pdf"),
    ("/api/convert/pdf-data/pdf-to-excel", "extract_excel_from_pdf"),
])
@patch('routers.pdf_data_extraction.pdf_data_service')
def test_pdf_data_extraction_value_error(mock_service, endpoint, method_name):
    getattr(mock_service, method_name).side_effect = ValueError("No table found")
    files = {"file": ("doc.pdf", b"fake_bytes", "application/pdf")}
    assert client.post(endpoint, files=files).status_code == 400