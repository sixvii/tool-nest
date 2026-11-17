import os
import pytest
import shutil
import tempfile
import subprocess
from io import BytesIO
from unittest.mock import patch

from services.ebook_service import convert_ebook


@patch('subprocess.run')
def test_convert_ebook_success(mock_run):
    stream = BytesIO(b"dummy ebook data")
    temp_dir = tempfile.mkdtemp()
    try:
        out_path = convert_ebook(stream, "book.epub", "pdf", temp_dir)
        
        assert out_path.endswith("book.pdf")
        assert os.path.exists(os.path.join(temp_dir, "book.epub"))
        
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert args[0] == "ebook-convert"
        assert args[1] == os.path.join(temp_dir, "book.epub")
        assert args[2] == os.path.join(temp_dir, "book.pdf")
    finally:
        shutil.rmtree(temp_dir)


@patch('subprocess.run')
def test_convert_ebook_failure(mock_run):
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="ebook-convert", stderr=b"Fatal error in calibre"
    )
    stream = BytesIO(b"dummy ebook data")
    temp_dir = tempfile.mkdtemp()
    try:
        with pytest.raises(RuntimeError, match="Calibre conversion error: Fatal error in calibre"):
            convert_ebook(stream, "book.mobi", "pdf", temp_dir)
    finally:
        shutil.rmtree(temp_dir)