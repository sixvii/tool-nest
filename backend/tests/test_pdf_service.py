import os
import pytest
from io import BytesIO
from unittest.mock import patch, MagicMock

from services.pdf_service import (
    merge_pdfs, split_pdf, rotate_pdf, rearrange_pdf,
    delete_pages_pdf, crop_pdf, resize_pdf, compress_pdf,
    protect_pdf, unlock_pdf, watermark_pdf, extract_images_pdf,
    edit_pdf, replace_text_pdf, parse_pdf, esign_pdf,
    parse_page_ranges,
)


@pytest.mark.parametrize("spec, expected", [
    ("0-2, 4, 6-8", [0, 1, 2, 4, 6, 7, 8]),   # mixed ranges + singles, order preserved
    ("3", [3]),                                # single
    ("5-2", [2, 3, 4, 5]),                     # reversed range normalised
    ("0, , 2", [0, 2]),                        # blank parts ignored
    ("", []),                                  # empty spec
    ("1,1,2", [1, 1, 2]),                      # duplicates preserved (split relies on order)
])
def test_parse_page_ranges(spec, expected):
    assert parse_page_ranges(spec) == expected


def test_parse_page_ranges_rejects_non_integer():
    with pytest.raises(ValueError):
        parse_page_ranges("1-x")


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_merge_pdfs(mock_writer, mock_reader):
    streams = [BytesIO(b"dummy1"), BytesIO(b"dummy2")]
    path = merge_pdfs(streams)
    try:
        assert path.endswith(".pdf")
        assert os.path.exists(path)
        assert mock_reader.call_count == 2
        mock_writer.return_value.append_pages_from_reader.assert_called()
        mock_writer.return_value.write.assert_called_once()
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_split_pdf_happy_path(mock_writer, mock_reader):
    # Mock a PDF with 5 pages
    mock_reader.return_value.pages = [MagicMock()] * 5
    
    path = split_pdf(BytesIO(b"dummy"), "0-2, 4")
    try:
        assert path.endswith(".pdf")
        assert mock_writer.return_value.add_page.call_count == 4
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_split_pdf_out_of_bounds(mock_writer, mock_reader):
    # Mock a PDF with only 2 pages
    mock_reader.return_value.pages = [MagicMock()] * 2
    
    # Requesting page index 3 should throw an error
    with pytest.raises(ValueError, match="out of bounds"):
        path = split_pdf(BytesIO(b"dummy"), "0, 3")
        if os.path.exists(path):
            os.remove(path)

@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_rotate_pdf(mock_writer, mock_reader):
    mock_page1 = MagicMock()
    mock_page2 = MagicMock()
    mock_reader.return_value.pages = [mock_page1, mock_page2]
    
    path = rotate_pdf(BytesIO(b"dummy"), 90, "1")
    try:
        assert path.endswith(".pdf")
        mock_page1.rotate.assert_not_called()          # Page 0 should NOT rotate
        mock_page2.rotate.assert_called_once_with(90)  # Page 1 SHOULD rotate
        assert mock_writer.return_value.add_page.call_count == 2
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_rearrange_pdf(mock_writer, mock_reader):
    mock_reader.return_value.pages = [MagicMock(), MagicMock(), MagicMock()]
    
    path = rearrange_pdf(BytesIO(b"dummy"), [2, 0, 1])
    try:
        assert mock_writer.return_value.add_page.call_count == 3
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_rearrange_pdf_out_of_bounds(mock_writer, mock_reader):
    mock_reader.return_value.pages = [MagicMock()]
    
    with pytest.raises(ValueError, match="out of bounds"):
        path = rearrange_pdf(BytesIO(b"dummy"), [2])
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_delete_pages_pdf(mock_writer, mock_reader):
    mock_reader.return_value.pages = [MagicMock(), MagicMock(), MagicMock()]
    
    path = delete_pages_pdf(BytesIO(b"dummy"), [0, 2])
    try:
        # Should only add page 1
        assert mock_writer.return_value.add_page.call_count == 1
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_crop_pdf(mock_writer, mock_reader):
    mock_page = MagicMock()
    mock_page.mediabox.left = 0
    mock_page.mediabox.bottom = 0
    mock_page.mediabox.width = 100
    mock_page.mediabox.height = 100
    mock_reader.return_value.pages = [mock_page]
    
    # Crop top-left 50%
    path = crop_pdf(BytesIO(b"dummy"), x_percent=0, y_percent=0, width_percent=50, height_percent=50)
    try:
        assert mock_page.mediabox.lower_left == (0.0, 50.0)
        assert mock_page.mediabox.upper_right == (50.0, 100.0)
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_resize_pdf(mock_writer, mock_reader):
    mock_page = MagicMock()
    mock_page.mediabox.width = 200
    mock_page.mediabox.height = 200
    mock_reader.return_value.pages = [mock_page]
    
    path = resize_pdf(BytesIO(b"dummy"), 400, 100)
    try:
        mock_page.scale.assert_called_once_with(2.0, 0.5)
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('subprocess.run')
def test_compress_pdf(mock_run):
    from services.sandbox import ghostscript_preexec
    path = compress_pdf(BytesIO(b"dummy_data"), 4)
    try:
        assert path.endswith(".pdf")
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "gs" in args
        assert "-dPDFSETTINGS=/screen" in args
        # Ghostscript must run under the rlimit preexec sandbox
        assert mock_run.call_args.kwargs["preexec_fn"] is ghostscript_preexec
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_ghostscript_preexec_sets_cpu_and_fsize_limits():
    # Run the preexec in a child process (never in the test process — setrlimit
    # there would clamp pytest itself). The child reports the effective limits.
    import subprocess
    import sys
    code = (
        "import resource; from services.sandbox import ghostscript_preexec;"
        "ghostscript_preexec();"
        "print(resource.getrlimit(resource.RLIMIT_CPU)[0],"
        "resource.getrlimit(resource.RLIMIT_FSIZE)[0])"
    )
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=30)
    assert out.returncode == 0, out.stderr
    cpu, fsize = out.stdout.split()
    assert int(cpu) == 300
    assert int(fsize) == 500 * 1024 * 1024


@patch('pypdf.PdfReader')
@patch('pypdf.PdfWriter')
def test_protect_and_unlock_pdf(mock_writer, mock_reader):
    mock_reader.return_value.is_encrypted = True
    
    path_protect = protect_pdf(BytesIO(b"dummy"), "secret")
    path_unlock = unlock_pdf(BytesIO(b"dummy"), "secret")
    
    try:
        mock_writer.return_value.encrypt.assert_called_with("secret")
        mock_reader.return_value.decrypt.assert_called_with("secret")
    finally:
        if os.path.exists(path_protect):
            os.remove(path_protect)
        if os.path.exists(path_unlock):
            os.remove(path_unlock)

@patch('fitz.Pixmap')
@patch('fitz.open')
def test_watermark_pdf(mock_fitz_open, mock_pixmap):
    mock_doc = MagicMock()
    mock_page = MagicMock()
    # The new function iterates using len(doc)
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc
    
    # Mock Pixmap to prevent the "unknown image file format" crash from dummy bytes
    mock_pix_instance = MagicMock()
    mock_pix_instance.width = 100
    mock_pix_instance.height = 100
    mock_pixmap.return_value = mock_pix_instance
    
    # Test text watermark
    path1 = watermark_pdf(BytesIO(b"dummy"), text="TEST")
    try:
        mock_page.insert_text.assert_called_once()
    finally:
        if os.path.exists(path1):
            os.remove(path1)

    # Test image watermark
    path2 = watermark_pdf(BytesIO(b"dummy"), image_stream=BytesIO(b"img"))
    try:
        mock_page.insert_image.assert_called_once()
    finally:
        if os.path.exists(path2):
            os.remove(path2)


@patch('fitz.open')
def test_edit_pdf(mock_fitz_open):
    mock_doc = MagicMock()
    mock_doc.__len__.return_value = 2 # 2 pages
    mock_fitz_open.return_value = mock_doc
    
    elements_json = '[{"type": "text", "text": "Edit", "x": 10, "y": 10, "page_index": 1, "color_hex": "#FF0000"}]'
    
    path = edit_pdf(BytesIO(b"dummy"), elements_json=elements_json, assets={})
    try:
        mock_doc[1].insert_text.assert_called_once_with((10, 22), "Edit", fontsize=12, color=(1.0, 0.0, 0.0))
    finally:
        if os.path.exists(path):
            os.remove(path)
        
    elements_out_of_bounds = '[{"type": "text", "text": "Edit", "x": 10, "y": 10, "page_index": 5}]'
    path_out = edit_pdf(BytesIO(b"dummy"), elements_json=elements_out_of_bounds, assets={})
    try:
        assert os.path.exists(path_out)  
    finally:
        if os.path.exists(path_out):
            os.remove(path_out)


@patch('fitz.open')
def test_extract_images_pdf(mock_fitz_open):
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    
    # Return one fake image reference
    mock_page.get_images.return_value = [(1, 0, 100, 100, 8, 'DeviceRGB', '', '', 'DCTDecode')]
    mock_doc.extract_image.return_value = {"image": b"fake_jpg_bytes", "ext": "jpg"}
    mock_fitz_open.return_value = mock_doc
    
    path = extract_images_pdf(BytesIO(b"dummy"))
    try:
        assert path.endswith(".zip")
        assert os.path.exists(path)
    finally:
        if os.path.exists(path):
            os.remove(path)

@patch('fitz.open')
def test_replace_text_pdf(mock_fitz_open):
    mock_doc = MagicMock()
    mock_page = MagicMock()
    
    mock_inst1 = MagicMock()
    mock_inst1.height, mock_inst1.x0, mock_inst1.y1 = 10, 0, 10
    
    mock_inst2 = MagicMock()
    mock_inst2.height, mock_inst2.x0, mock_inst2.y1 = 10, 50, 10
    
    mock_page.search_for.return_value = [mock_inst1, mock_inst2]
    mock_fitz_open.return_value = mock_doc
    
    mock_doc.__iter__.return_value = [mock_page]
    path_all = replace_text_pdf(BytesIO(b"dummy"), "find", "replace", mode="all")
    try:
        assert mock_page.add_redact_annot.call_count == 2
        assert mock_page.insert_text.call_count == 2
    finally:
        if os.path.exists(path_all):
            os.remove(path_all)
            
    mock_page.add_redact_annot.reset_mock()
    mock_page.insert_text.reset_mock()
    
    mock_doc.__iter__.return_value = [mock_page] 
    path_single = replace_text_pdf(BytesIO(b"dummy"), "find", "replace", mode="single", match_index=1)
    try:
        mock_page.add_redact_annot.assert_called_once_with(mock_inst2, fill=(1, 1, 1))
        mock_page.insert_text.assert_called_once()
    finally:
        if os.path.exists(path_single):
            os.remove(path_single)



@patch('fitz.open')
def test_parse_pdf(mock_fitz_open):
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc

    # Mock the internal dictionary structure that PyMuPDF returns
    mock_page.get_text.return_value = {
        "blocks": [{
            "type": 0,
            "lines": [{
                "spans": [{
                    "text": "Hello World",
                    "color": 255,
                    "flags": 16, # 16 triggers the 'bold' bitwise check
                    "font": "Helvetica",
                    "size": 14.5,
                    "bbox": (10.0, 20.0, 100.0, 35.0)
                }]
            }]
        }]
    }

    result = parse_pdf(BytesIO(b"dummy"))

    assert "pages" in result
    assert len(result["pages"]) == 1
    blocks = result["pages"][0]["blocks"]
    assert len(blocks) == 1
    assert blocks[0]["text"] == "Hello World"
    assert blocks[0]["bold"] is True
    assert blocks[0]["font_size"] == 14.5


@patch('fitz.open')
def test_edit_pdf_advanced_shapes_and_erase(mock_fitz_open):
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc
    
    elements_json = '''[
        {"type": "erase", "x": 0, "y": 0, "w": 10, "h": 10, "page_index": 0},
        {"type": "shape", "shape_type": "rect", "x": 10, "y": 10, "w": 50, "h": 50, "page_index": 0, "color_hex": "#000000", "fill_color": "#FFFFFF"},
        {"type": "image", "x": 0, "y": 0, "w": 100, "h": 100, "page_index": 0}
    ]'''
    
    path = edit_pdf(BytesIO(b"dummy"), elements_json=elements_json, assets={"image_2": b"fake_img_bytes"})
    try:
        mock_page.add_redact_annot.assert_called_once()
        mock_page.apply_redactions.assert_called_once()
        mock_page.draw_rect.assert_called_once()
        mock_page.insert_image.assert_called_once()
    finally:
        if os.path.exists(path):
            os.remove(path)


@patch('fitz.open')
def test_esign_pdf_text_and_image(mock_fitz_open):
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.rect.width = 500
    mock_page.rect.height = 800
    mock_doc.__len__.return_value = 1
    mock_doc.__getitem__.return_value = mock_page
    mock_fitz_open.return_value = mock_doc

    # Test Text Signature Branch
    path1 = esign_pdf(BytesIO(b"dummy"), signature_type="text", signature_text="John Doe", x=0.5, y=0.5)
    try:
        mock_page.insert_text.assert_called_once()
    finally:
        if os.path.exists(path1):
            os.remove(path1)

    # Test Image Signature Branch
    path2 = esign_pdf(BytesIO(b"dummy"), signature_type="image", signature_image_stream=BytesIO(b"img"), x=0.1, y=0.1)
    try:
        mock_page.insert_image.assert_called_once()
    finally:
        if os.path.exists(path2):
            os.remove(path2)