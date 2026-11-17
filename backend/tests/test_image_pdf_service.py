import os
import pytest
import zipfile
from io import BytesIO
from unittest.mock import patch, MagicMock

from services.image_pdf_service import (
    convert_images_to_pdf,
    convert_pdf_to_images,
    convert_heic_to_pdf,
    convert_eps_to_pdf
)


@patch('PIL.Image.open')
def test_convert_images_to_pdf(mock_open):
    # Create mock images: One RGB, one RGBA (which requires conversion)
    mock_img1 = MagicMock()
    mock_img1.mode = "RGB"
    
    mock_img2 = MagicMock()
    mock_img2.mode = "RGBA"
    mock_rgb_img2 = MagicMock()
    mock_img2.convert.return_value = mock_rgb_img2

    mock_open.side_effect = [mock_img1, mock_img2]

    stream1 = BytesIO(b"dummy1")
    stream2 = BytesIO(b"dummy2")

    out_path = convert_images_to_pdf([stream1, stream2])

    try:
        assert out_path.endswith(".pdf")
        assert os.path.exists(out_path)
        
        mock_img1.save.assert_called_once()
        args, kwargs = mock_img1.save.call_args
        assert args[0] == out_path
        assert args[1] == "PDF"
        assert kwargs["save_all"] is True
        assert kwargs["append_images"] == [mock_rgb_img2]
        
        mock_img1.close.assert_called_once()
        mock_img2.close.assert_called_once()
        mock_rgb_img2.close.assert_called_once()
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('pdf2image.convert_from_path')
def test_convert_pdf_to_images_single_page(mock_convert):
    mock_img = MagicMock()
    mock_convert.return_value = [mock_img]

    stream = BytesIO(b"dummy pdf")
    out_path = convert_pdf_to_images(stream, "png")
    
    try:
        assert out_path.endswith(".png")
        assert os.path.exists(out_path)
        
        mock_convert.assert_called_once()
        mock_img.save.assert_called_once_with(out_path, format="PNG")
        mock_img.close.assert_called_once()
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('pdf2image.convert_from_path')
def test_convert_pdf_to_images_multi_page(mock_convert):
    def fake_save(path, format=None):
        # Physically write a file so zipfile has something to archive
        with open(path, "wb") as f:
            f.write(b"fake image data")

    mock_img1 = MagicMock()
    mock_img1.save.side_effect = fake_save
    mock_img2 = MagicMock()
    mock_img2.save.side_effect = fake_save
    
    mock_convert.return_value = [mock_img1, mock_img2]

    stream = BytesIO(b"dummy pdf")
    out_path = convert_pdf_to_images(stream, "jpg")
    
    try:
        assert out_path.endswith(".zip")
        assert os.path.exists(out_path)
        
        mock_convert.assert_called_once()
        mock_img1.save.assert_called_once()
        mock_img2.save.assert_called_once()
        
        # Verify the zip bundled the correct pages internally
        with zipfile.ZipFile(out_path, 'r') as z:
            names = z.namelist()
            assert "page_1.jpg" in names
            assert "page_2.jpg" in names
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('pdf2image.convert_from_path')
def test_convert_pdf_to_images_invalid_pdf(mock_convert):
    from pdf2image.exceptions import PDFPageCountError
    mock_convert.side_effect = PDFPageCountError("Corrupted PDF")
    stream = BytesIO(b"dummy pdf")
    
    with pytest.raises(ValueError, match="The uploaded file is not a valid PDF or is corrupted."):
        convert_pdf_to_images(stream, "png")


@patch('pillow_heif.register_heif_opener')
@patch('PIL.Image.open')
def test_convert_heic_to_pdf(mock_open, mock_register):
    mock_img = MagicMock()
    mock_img.mode = "RGB"
    mock_open.return_value = mock_img

    stream = BytesIO(b"dummy heic")
    out_path = convert_heic_to_pdf([stream])
    
    try:
        assert out_path.endswith(".pdf")
        assert os.path.exists(out_path)
        
        mock_register.assert_called_once()
        mock_open.assert_called_once_with(stream)
        mock_img.save.assert_called_once()
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@patch('PIL.Image.open')
def test_convert_eps_to_pdf(mock_open):
    mock_img = MagicMock()
    mock_img.mode = "RGB"
    mock_open.return_value = mock_img

    stream = BytesIO(b"dummy eps")
    out_path = convert_eps_to_pdf([stream])
    
    try:
        assert out_path.endswith(".pdf")
        assert os.path.exists(out_path)
        
        mock_open.assert_called_once()
        # Verify that Pillow is opening the temporary .eps file dumped by the service
        assert mock_open.call_args[0][0].endswith('.eps')
        
        mock_img.load.assert_called_once()
        mock_img.save.assert_called_once()
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)