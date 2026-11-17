import os
import pytest
import zipfile
import pandas as pd
from io import BytesIO
from unittest.mock import patch, MagicMock

from services.pdf_data_service import (
    extract_text_from_pdf,
    extract_csv_from_pdf,
    extract_excel_from_pdf
)


@patch('fitz.open')
def test_extract_text_from_pdf(mock_fitz_open):
    mock_doc = MagicMock()
    mock_page1 = MagicMock()
    mock_page1.get_text.return_value = "Page 1 text"
    mock_page2 = MagicMock()
    mock_page2.get_text.return_value = "Page 2 text"
    
    # Simulate doc iteration
    mock_doc.__iter__.return_value = [mock_page1, mock_page2]
    mock_fitz_open.return_value = mock_doc
    
    stream = BytesIO(b"dummy pdf bytes")
    out_path = extract_text_from_pdf(stream)
    
    try:
        assert out_path.endswith(".txt")
        assert os.path.exists(out_path)
        
        with open(out_path, "r", encoding="utf-8") as f:
            content = f.read()
            assert "Page 1 text\n\nPage 2 text" in content
            
        mock_fitz_open.assert_called_once()
        mock_doc.close.assert_called_once()
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('tabula.read_pdf')
def test_extract_csv_from_pdf_single_table(mock_read_pdf):
    df = pd.DataFrame({"col1": [1, 2], "col2": [3, 4]})
    mock_read_pdf.return_value = [df]
    
    stream = BytesIO(b"dummy pdf bytes")
    out_path = extract_csv_from_pdf(stream)
    
    try:
        assert out_path.endswith(".csv")
        assert os.path.exists(out_path)
        
        res_df = pd.read_csv(out_path)
        assert len(res_df) == 2
        assert list(res_df.columns) == ["col1", "col2"]
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('tabula.read_pdf')
def test_extract_csv_from_pdf_multiple_tables(mock_read_pdf):
    df1 = pd.DataFrame({"col1": [1, 2]})
    df2 = pd.DataFrame({"col2": [3, 4]})
    mock_read_pdf.return_value = [df1, df2]
    
    stream = BytesIO(b"dummy pdf bytes")
    out_path = extract_csv_from_pdf(stream)
    
    try:
        assert out_path.endswith(".zip")
        assert os.path.exists(out_path)
        
        with zipfile.ZipFile(out_path, 'r') as z:
            names = z.namelist()
            assert "table_1.csv" in names
            assert "table_2.csv" in names
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('tabula.read_pdf')
def test_extract_csv_from_pdf_empty(mock_read_pdf):
    mock_read_pdf.return_value = []
    stream = BytesIO(b"dummy pdf bytes")
    
    with pytest.raises(ValueError, match="No tabular data could be found"):
        extract_csv_from_pdf(stream)


@patch('tabula.read_pdf')
def test_extract_excel_from_pdf(mock_read_pdf):
    df1 = pd.DataFrame({"col1": [1, 2]})
    df2 = pd.DataFrame({"col2": [3, 4]})
    mock_read_pdf.return_value = [df1, df2]
    
    stream = BytesIO(b"dummy pdf bytes")
    out_path = extract_excel_from_pdf(stream)
    
    try:
        assert out_path.endswith(".xlsx")
        assert os.path.exists(out_path)
        
        dfs = pd.read_excel(out_path, sheet_name=None)
        assert "Table_1" in dfs
        assert "Table_2" in dfs
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('tabula.read_pdf')
def test_extract_excel_from_pdf_empty(mock_read_pdf):
    mock_read_pdf.return_value = []
    stream = BytesIO(b"dummy pdf bytes")
    
    with pytest.raises(ValueError, match="No tabular data could be found"):
        extract_excel_from_pdf(stream)