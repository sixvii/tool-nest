import os
import pytest
import shutil
import tempfile
import zipfile
import pandas as pd
from io import BytesIO
from unittest.mock import patch

from services.file_service import (
    convert_csv_to_excel,
    convert_excel_to_csv,
    split_csv,
    split_excel
)


def create_dummy_csv():
    """Creates a basic in-memory CSV file with 4 rows of data."""
    return BytesIO(b"col1,col2\n1,2\n3,4\n5,6\n7,8")


def create_dummy_excel(multi_sheet=False):
    """Creates a basic in-memory Excel file, optionally with multiple sheets."""
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df1 = pd.DataFrame({"col1": [1, 3, 5, 7], "col2": [2, 4, 6, 8]})
        df1.to_excel(writer, sheet_name="Sheet1", index=False)
        if multi_sheet:
            df2 = pd.DataFrame({"col3": [9], "col4": [10]})
            df2.to_excel(writer, sheet_name="Sheet2", index=False)
    buf.seek(0)
    return buf


def test_convert_csv_to_excel():
    temp_dir = tempfile.mkdtemp()
    try:
        stream = create_dummy_csv()
        out_path = convert_csv_to_excel(stream, "data.csv", temp_dir)
        
        assert out_path.endswith("data.xlsx")
        assert os.path.exists(out_path)
        
        # Verify the Excel file is intact
        df = pd.read_excel(out_path)
        assert len(df) == 4
        assert list(df.columns) == ["col1", "col2"]
    finally:
        shutil.rmtree(temp_dir)


def test_convert_excel_to_csv_single_sheet():
    temp_dir = tempfile.mkdtemp()
    try:
        stream = create_dummy_excel(multi_sheet=False)
        out_path = convert_excel_to_csv(stream, "data.xlsx", temp_dir)
        
        assert out_path.endswith("data.csv")
        assert os.path.exists(out_path)
        
        # Verify the CSV file is intact
        df = pd.read_csv(out_path)
        assert len(df) == 4
    finally:
        shutil.rmtree(temp_dir)


def test_convert_excel_to_csv_multi_sheet():
    temp_dir = tempfile.mkdtemp()
    try:
        stream = create_dummy_excel(multi_sheet=True)
        out_path = convert_excel_to_csv(stream, "data.xlsx", temp_dir)
        
        assert out_path.endswith("data_csvs.zip")
        assert os.path.exists(out_path)
        
        # Verify the Zip archive bundled both sheets
        with zipfile.ZipFile(out_path, 'r') as z:
            names = z.namelist()
            assert "Sheet1.csv" in names
            assert "Sheet2.csv" in names
    finally:
        shutil.rmtree(temp_dir)


@patch('pandas.read_excel')
def test_convert_excel_to_csv_empty(mock_read_excel):
    # Test exception handling when an Excel file has zero tabular content
    mock_read_excel.return_value = {}
    temp_dir = tempfile.mkdtemp()
    try:
        stream = BytesIO(b"dummy")
        with pytest.raises(ValueError, match="No tabular data could be found"):
            convert_excel_to_csv(stream, "data.xlsx", temp_dir)
    finally:
        shutil.rmtree(temp_dir)


def test_split_csv():
    temp_dir = tempfile.mkdtemp()
    try:
        stream = create_dummy_csv()
        out_path = split_csv(stream, "data.csv", 2, temp_dir)
        
        assert out_path.endswith("data_split.zip")
        assert os.path.exists(out_path)
        
        with zipfile.ZipFile(out_path, 'r') as z:
            names = z.namelist()
            assert "data_part_1.csv" in names
            assert "data_part_2.csv" in names
    finally:
        shutil.rmtree(temp_dir)


def test_split_excel():
    temp_dir = tempfile.mkdtemp()
    try:
        stream = create_dummy_excel(multi_sheet=True)
        # Sheet1 has 4 rows, Sheet2 has 1 row. By setting chunk limit to 2:
        # Sheet1 should be split into 2 parts, Sheet2 into 1 part
        out_path = split_excel(stream, "data.xlsx", 2, temp_dir)
        
        assert out_path.endswith("data_split.zip")
        assert os.path.exists(out_path)
        
        with zipfile.ZipFile(out_path, 'r') as z:
            names = z.namelist()
            assert "Sheet1_part_1.xlsx" in names
            assert "Sheet1_part_2.xlsx" in names
            assert "Sheet2_part_1.xlsx" in names
    finally:
        shutil.rmtree(temp_dir)


@patch('pandas.read_excel')
def test_split_excel_empty_sheet(mock_read_excel):
    # Test that a sheet with zero rows doesn't break the loop
    mock_read_excel.return_value = {"EmptySheet": pd.DataFrame()}
    temp_dir = tempfile.mkdtemp()
    try:
        stream = BytesIO(b"dummy")
        out_path = split_excel(stream, "empty.xlsx", 2, temp_dir)
        
        assert os.path.exists(out_path)
        with zipfile.ZipFile(out_path, 'r') as z:
            names = z.namelist()
            assert "EmptySheet_part_1.xlsx" in names
    finally:
        shutil.rmtree(temp_dir)