import os
import pytest
import shutil
import tempfile
import subprocess
from io import BytesIO
from unittest.mock import patch, MagicMock

from services.office_service import (
    _run_subprocess,
    _convert_via_libreoffice,
    convert_word_to_pdf,
    convert_pdf_to_word,
    convert_ppt_to_pdf,
    convert_pdf_to_ppt,
    convert_msg_to_pdf
)


@patch('subprocess.run')
def test_run_subprocess_success(mock_run):
    # Happy path
    _run_subprocess(["echo", "hello"])
    mock_run.assert_called_once_with(
        ["echo", "hello"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600
    )


@patch('subprocess.run')
def test_run_subprocess_called_process_error(mock_run):
    # Simulate an error returned by the subprocess (e.g., libreoffice crash)
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="libreoffice", stderr=b"Simulated crash"
    )
    with pytest.raises(RuntimeError, match="Command 'libreoffice' failed: Simulated crash"):
        _run_subprocess(["libreoffice", "--headless"])


@patch('subprocess.run')
def test_run_subprocess_file_not_found(mock_run):
    # Simulate the command not being installed
    mock_run.side_effect = FileNotFoundError()
    with pytest.raises(RuntimeError, match="Command 'libreoffice' not found"):
        _run_subprocess(["libreoffice", "--headless"])


@patch('services.office_service._run_subprocess')
def test_convert_word_to_pdf(mock_run):
    stream = BytesIO(b"dummy docx data")
    temp_dir = tempfile.mkdtemp()
    try:
        out_path = convert_word_to_pdf(stream, "document.docx", temp_dir)
        assert out_path.endswith("document.pdf")
        assert os.path.exists(os.path.join(temp_dir, "document.docx"))
        
        # Assert that it went through unoserver's unoconvert client, not a
        # direct libreoffice spawn (see backend context doc's "Why
        # unoserver" section — that's now the primary path, libreoffice is
        # only the fallback when unoserver is unreachable).
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert args[0] == "unoconvert"
        assert "--convert-to" in args
    finally:
        shutil.rmtree(temp_dir)


@patch('pdf2docx.Converter')
def test_convert_pdf_to_word(mock_converter):
    stream = BytesIO(b"dummy pdf data")
    temp_dir = tempfile.mkdtemp()
    try:
        out_path = convert_pdf_to_word(stream, "document.pdf", temp_dir)
        assert out_path.endswith("document.docx")
        assert os.path.exists(os.path.join(temp_dir, "document.pdf"))
        
        mock_converter.assert_called_once_with(os.path.join(temp_dir, "document.pdf"))
        mock_converter.return_value.convert.assert_called_once_with(out_path)
        mock_converter.return_value.close.assert_called_once()
    finally:
        shutil.rmtree(temp_dir)


@patch('services.office_service._run_subprocess')
def test_convert_ppt_to_pdf(mock_run):
    stream = BytesIO(b"dummy pptx data")
    temp_dir = tempfile.mkdtemp()
    try:
        out_path = convert_ppt_to_pdf(stream, "presentation.pptx", temp_dir)
        assert out_path.endswith("presentation.pdf")
        assert os.path.exists(os.path.join(temp_dir, "presentation.pptx"))
        mock_run.assert_called_once()
    finally:
        shutil.rmtree(temp_dir)


@patch('pdfplumber.open')
@patch('pptx.Presentation')
def test_convert_pdf_to_ppt_happy_path(mock_presentation, mock_pdfplumber_open):
    stream = BytesIO(b"dummy pdf data")
    temp_dir = tempfile.mkdtemp()
    
    # Mock pdfplumber structures
    mock_pdf = MagicMock()
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Extracted Page Text"
    mock_page.images = [{"x0": 0, "top": 0, "x1": 100, "bottom": 100, "width": 100, "height": 100, "page_number": 1, "object_type": "image"}]
    
    mock_cropped = MagicMock()
    mock_img_obj = MagicMock()
    mock_page.crop.return_value = mock_cropped
    mock_cropped.to_image.return_value = mock_img_obj
    mock_pdf.pages = [mock_page]
    
    # Attach context manager behavior
    mock_pdfplumber_open.return_value.__enter__.return_value = mock_pdf
    
    # Mock pptx structures
    mock_prs = MagicMock()
    mock_presentation.return_value = mock_prs
    mock_slide = MagicMock()
    mock_prs.slides.add_slide.return_value = mock_slide
    mock_prs.slide_layouts = [MagicMock()] * 7 
    
    try:
        out_path = convert_pdf_to_ppt(stream, "document.pdf", temp_dir)
        assert out_path.endswith("document.pptx")
        
        mock_presentation.assert_called_once()
        mock_pdfplumber_open.assert_called_once()
        
        # Verify it attempted to add text and images
        mock_slide.shapes.add_textbox.assert_called_once()
        mock_slide.shapes.add_picture.assert_called_once()
        mock_prs.save.assert_called_once_with(out_path)
    finally:
        shutil.rmtree(temp_dir)


@patch('services.office_service._run_subprocess')
def test_convert_msg_to_pdf(mock_run):
    stream = BytesIO(b"dummy msg data")
    temp_dir = tempfile.mkdtemp()
    try:
        out_path = convert_msg_to_pdf(stream, "email.msg", temp_dir)
        assert out_path.endswith("email.pdf")
        
        # Should call subprocess twice: msgconvert -> unoconvert (unoserver)
        assert mock_run.call_count == 2
        
        msgconvert_args = mock_run.call_args_list[0][0][0]
        unoconvert_args = mock_run.call_args_list[1][0][0]
        assert "msgconvert" in msgconvert_args[0]
        assert unoconvert_args[0] == "unoconvert"
    finally:
        shutil.rmtree(temp_dir)

# unoserver fallback (see backend context doc's "Why unoserver" section):
# _convert_via_libreoffice should fall back to spawning `libreoffice`
# directly when the `unoconvert` client can't reach the unoserver daemon.
# This was flagged as untested — first coverage of that path.
@patch('services.office_service._run_subprocess')
def test_convert_via_libreoffice_falls_back_when_unoserver_unreachable(mock_run):
    # First call (unoconvert) fails as if unoserver isn't running; second
    # call (direct libreoffice spawn) succeeds.
    mock_run.side_effect = [RuntimeError("Command 'unoconvert' failed: Connection refused"), None]

    temp_dir = tempfile.mkdtemp()
    try:
        input_path = os.path.join(temp_dir, "doc.docx")
        with open(input_path, "wb") as f:
            f.write(b"dummy docx bytes")

        out_path = _convert_via_libreoffice(input_path, temp_dir, convert_to="pdf")

        assert out_path.endswith("doc.pdf")
        assert mock_run.call_count == 2

        unoconvert_args = mock_run.call_args_list[0][0][0]
        libreoffice_args = mock_run.call_args_list[1][0][0]
        assert unoconvert_args[0] == "unoconvert"
        assert libreoffice_args[0] == "libreoffice"
        assert "--convert-to" in libreoffice_args
        assert input_path in libreoffice_args
    finally:
        shutil.rmtree(temp_dir)


@patch('services.office_service._run_subprocess')
def test_convert_via_libreoffice_uses_unoserver_when_reachable(mock_run):
    """Sanity check for the non-fallback path: when unoconvert succeeds,
    libreoffice should never be spawned directly."""
    mock_run.return_value = None

    temp_dir = tempfile.mkdtemp()
    try:
        input_path = os.path.join(temp_dir, "doc.docx")
        with open(input_path, "wb") as f:
            f.write(b"dummy docx bytes")

        out_path = _convert_via_libreoffice(input_path, temp_dir, convert_to="pdf")

        assert out_path.endswith("doc.pdf")
        assert mock_run.call_count == 1
        assert mock_run.call_args_list[0][0][0][0] == "unoconvert"
    finally:
        shutil.rmtree(temp_dir)
