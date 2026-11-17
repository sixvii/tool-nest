import os
import io
import tempfile
import pytest
import subprocess
from PIL import Image, ImageFont
from unittest.mock import MagicMock, ANY, patch

from services import image_tools_service
from services.image_tools_service import (
    add_border,
    add_text_to_image,
    FONT_MAP,
    black_and_white,
    compress_image,
    convert_image_format,
    convert_image_magick,
    crop_image,
    flip_image,
    font_awesome_to_png,
    image_to_text,
    jpg_to_tiff,
    remove_background,
    remove_metadata,
    resize_image,
    round_image,
    split_image,
    tiff_to_text,
    view_metadata,
)

_REAL_DEFAULT_FONT = ImageFont.load_default()



@patch('PIL.Image.open')
def test_resize_image(mock_open):
    mock_img = MagicMock()
    mock_img.format = "JPEG"
    mock_resized = MagicMock()
    mock_img.resize.return_value = mock_resized
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    _, fmt = resize_image(stream, 800, 600)

    assert fmt == "jpeg"
    mock_open.assert_called_once_with(stream)
    mock_img.resize.assert_called_once_with((800, 600), Image.LANCZOS)
    mock_resized.save.assert_called_once()


@patch('PIL.Image.open')
def test_compress_image(mock_open):
    mock_img = MagicMock()
    mock_img.mode = "RGBA"
    mock_converted = MagicMock()
    mock_img.convert.return_value = mock_converted
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    buf = compress_image(stream, 75)

    mock_img.convert.assert_called_once_with("RGB")
    mock_converted.save.assert_called_once_with(buf, format="JPEG", quality=75, optimize=True)

@patch('PIL.Image.open')
def test_jpg_to_tiff(mock_open):
    mock_img = MagicMock()
    mock_img.mode = "RGB"
    mock_open.return_value = mock_img
    
    stream = io.BytesIO(b"dummy")
    jpg_to_tiff(stream)
    
    mock_open.assert_called_once_with(stream)
    mock_img.save.assert_called_once()
    _, kwargs = mock_img.save.call_args
    assert kwargs.get("format") == "TIFF"


@pytest.mark.parametrize("icon_input", ["f000", "\\uf000", "U+f000"])
def test_font_awesome_to_png(icon_input):
    buf = font_awesome_to_png(icon_input, 100, "red")    
    out_img = Image.open(buf)
    assert out_img.format == "PNG"
    assert out_img.size == (100, 100)


@patch('PIL.Image.open')
def test_flip_image(mock_open):
    mock_img = MagicMock()
    mock_img.format = "PNG"
    mock_flipped = MagicMock()
    mock_img.transpose.return_value = mock_flipped
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    _, fmt = flip_image(stream, "horizontal")

    assert fmt == "png"
    mock_img.transpose.assert_called_once_with(Image.FLIP_LEFT_RIGHT)
    mock_flipped.save.assert_called_once()

@patch('exiftool.ExifToolHelper')
def test_view_metadata(mock_exiftool):
    mock_instance = MagicMock()
    mock_exiftool.return_value.__enter__.return_value = mock_instance
    
    mock_instance.get_metadata.return_value = [{
        "SourceFile": "/tmp/dummy.jpg",          
        "ExifTool:Error": "None",                
        "EXIF:Make": "Apple",                    
        "EXIF:Model": "iPhone 15 Pro",           
        "ThumbnailImage": b"binary_blob_data"    
    }]

    stream = io.BytesIO(b"dummy")
    
    metadata = view_metadata(stream, "test_photo.jpg")

    assert metadata.get("EXIF:Make") == "Apple"
    assert metadata.get("EXIF:Model") == "iPhone 15 Pro"
    assert "SourceFile" not in metadata
    assert "ThumbnailImage" not in metadata


@patch('zipfile.ZipFile')
@patch('PIL.Image.open')
def test_split_image(mock_open, mock_zip):
    mock_img = MagicMock()
    mock_img.format = "PNG"
    mock_img.width = 100
    mock_img.height = 100
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    out_path = split_image(stream, 2, 2, "/tmp")

    assert out_path == "/tmp/split_images.zip"
    assert mock_img.crop.call_count == 4
    mock_zip.assert_called_once_with("/tmp/split_images.zip", 'w')


@patch('subprocess.run')
def test_convert_image_magick_success(mock_run):
    out_path = None
    try:
        out_path = convert_image_magick("input.png", "eps", ["-density", "300"])
        
        assert out_path.endswith(".eps")
        mock_run.assert_called_once()
        
        args = mock_run.call_args[0][0]
        assert args[0] == "convert"
        # resource ceilings must be present, before the input, to bound a
        # hostile/oversized EPS (delegated to Ghostscript)
        assert "-limit" in args
        assert "memory" in args and "area" in args and "time" in args
        assert args.index("-limit") < args.index("input.png")
        assert "-density" in args
        assert "300" in args
        assert "input.png" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_convert_image_magick_failure(mock_run):
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="convert", stderr=b"Fatal Magick error"
    )
    with pytest.raises(RuntimeError, match="ImageMagick error: Fatal Magick error"):
        convert_image_magick("input.png", "eps")



@patch('rembg.remove')
@patch('rembg.new_session')
@patch('PIL.Image.open')
def test_remove_background(mock_open, mock_new_session, mock_remove):
    # cache_clear() so this test sees a cold session regardless of order.
    image_tools_service._rembg_session.cache_clear()

    mock_img = MagicMock()
    mock_open.return_value = mock_img

    mock_session = MagicMock()
    mock_new_session.return_value = mock_session

    mock_out_img = MagicMock()
    mock_remove.return_value = mock_out_img

    stream = io.BytesIO(b"dummy")

    # default: alpha_matting OFF — the fast path, no matting kwargs passed
    remove_background(stream)

    mock_new_session.assert_called_once_with(ANY)
    mock_remove.assert_called_once_with(mock_img, session=mock_session)
    assert "alpha_matting" not in mock_remove.call_args.kwargs
    mock_out_img.save.assert_called_once()


@patch('rembg.remove')
@patch('rembg.new_session')
@patch('PIL.Image.open')
def test_remove_background_alpha_matting(mock_open, mock_new_session, mock_remove):
    """Opt-in alpha_matting takes the slower, edge-refining path with the
    matting kwargs."""
    image_tools_service._rembg_session.cache_clear()
    mock_open.return_value = MagicMock()
    mock_new_session.return_value = MagicMock()
    mock_remove.return_value = MagicMock()

    remove_background(io.BytesIO(b"dummy"), alpha_matting=True)

    kwargs = mock_remove.call_args.kwargs
    assert kwargs["alpha_matting"] is True
    assert kwargs["alpha_matting_foreground_threshold"] == 240


@patch('rembg.new_session')
def test_rembg_session_is_cached(mock_new_session):
    """The ONNX session must be built once and reused, not rebuilt per call —
    this is the fix for the per-request model-reload waste. Clearing the cache
    first, two calls should hit rembg.new_session exactly once."""
    image_tools_service._rembg_session.cache_clear()
    mock_new_session.return_value = MagicMock()

    s1 = image_tools_service._rembg_session()
    s2 = image_tools_service._rembg_session()

    assert s1 is s2
    mock_new_session.assert_called_once()
    image_tools_service._rembg_session.cache_clear()


@patch('pytesseract.image_to_string')
@patch('PIL.Image.open')
def test_image_to_text(mock_open, mock_image_to_string):
    mock_open.return_value = MagicMock()
    mock_image_to_string.return_value = "Parsed Text\n123"

    stream = io.BytesIO(b"dummy")
    buf = image_to_text(stream)

    assert buf.read() == "Parsed Text\n123"
    mock_image_to_string.assert_called_once()


@patch('PIL.Image.open')
def test_crop_image(mock_open):
    mock_img = MagicMock()
    mock_img.format = "PNG"
    mock_cropped = MagicMock()
    mock_img.crop.return_value = mock_cropped
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    _, fmt = crop_image(stream, 10, 20, 100, 100)

    assert fmt == "png"
    mock_img.crop.assert_called_once_with((10, 20, 110, 120))
    mock_cropped.save.assert_called_once()


@patch('PIL.ImageDraw.Draw')
@patch('PIL.Image.new')
@patch('PIL.Image.open')
def test_round_image(mock_open, mock_new, mock_draw):
    mock_img = MagicMock()
    mock_img.convert.return_value = mock_img
    mock_img.crop.return_value = mock_img
    mock_img.size = (200, 100)
    mock_img.width = 200
    mock_img.height = 100
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    round_image(stream)

    mock_img.convert.assert_called_once_with("RGBA")
    mock_img.crop.assert_called_once()
    mock_img.putalpha.assert_called_once()
    mock_img.save.assert_called_once()


@patch('PIL.Image.open')
def test_black_and_white(mock_open):
    mock_img = MagicMock()
    mock_img.format = "JPEG"
    mock_bw = MagicMock()
    mock_img.convert.return_value = mock_bw
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    _, fmt = black_and_white(stream)

    assert fmt == "jpeg"
    mock_img.convert.assert_called_once_with("L")
    mock_bw.save.assert_called_once()


@patch('PIL.Image.open')
def test_convert_image_format(mock_open):
    mock_img = MagicMock()
    mock_img.mode = "RGBA"
    mock_converted = MagicMock()
    mock_img.convert.return_value = mock_converted
    mock_open.return_value = mock_img

    stream = io.BytesIO(b"dummy")
    out_path = convert_image_format(stream, "jpg")

    mock_img.convert.assert_called_once_with("RGB")
    mock_converted.save.assert_called_once()
    assert out_path.endswith(".jpg")
    
    if os.path.exists(out_path):
        os.remove(out_path)

@patch('exiftool.ExifToolHelper')
@patch('PIL.ImageOps.exif_transpose')
@patch('PIL.Image.open')
def test_remove_metadata_func(mock_open, mock_transpose, mock_exiftool):
    mock_img = MagicMock()
    mock_img.format = "JPEG"
    mock_open.return_value = mock_img
    
    mock_transposed = MagicMock()
    mock_transpose.return_value = mock_transposed

    mock_et_instance = MagicMock()
    mock_exiftool.return_value.__enter__.return_value = mock_et_instance

    stream = io.BytesIO(b"dummy")
    out_path, ext = remove_metadata(stream, "test.jpg")

    assert ext == ".jpg"
    mock_transpose.assert_called_once_with(mock_img)
    mock_transposed.save.assert_called_once()
    
    mock_et_instance.execute.assert_called_once_with(
        "-all=", 
        "-icc_profile=", 
        "-xmp:all=", 
        "-overwrite_original", 
        ANY
    )
    assert out_path.endswith(".jpg")
    
    if os.path.exists(out_path):
        os.remove(out_path)


@patch('pytesseract.image_to_string')
def test_tiff_to_text(mock_image_to_string):
    """Runs against a real temp file (only tesseract mocked, like
    test_image_to_text) so the finally-block cleanup is actually exercised.
    The trailing assert catches the leak this function had: mkstemp'd a temp
    file but never removed it — see [[Tool-Nest - Known Issues]]."""
    mock_image_to_string.return_value = "Parsed TIFF Text"

    created = {}
    real_mkstemp = tempfile.mkstemp

    def spy_mkstemp(*args, **kwargs):
        fd, path = real_mkstemp(*args, **kwargs)
        created["path"] = path
        return fd, path

    stream = io.BytesIO(b"dummy")
    with patch("tempfile.mkstemp", side_effect=spy_mkstemp):
        buf = tiff_to_text(stream)

    assert buf.read() == "Parsed TIFF Text"
    mock_image_to_string.assert_called_once_with(created["path"])
    # the temp file must be gone — fails against the pre-fix leaking version
    assert not os.path.exists(created["path"])


@pytest.mark.parametrize("style", [
    "solid", "dashed", "dotted", "double", "rounded", 
    "groove", "ridge", "inset", "outset", "shadow", 
    "polaroid", "matte", "neon", "unknown_fallback"
])
def test_add_border_all_styles(style):
    test_img = Image.new("RGB", (10, 10), color="blue")
    stream = io.BytesIO()
    test_img.save(stream, format="PNG")
    stream.seek(0)

    buf, fmt = add_border(
        file_stream=stream, 
        border_width=4, 
        color="#FF0000", 
        style=style
    )

    assert fmt == "png"
    
    out_img = Image.open(buf)
    assert out_img.width > 10
    assert out_img.height > 10


# ---------------------------------------------------------------------------
# add_text_to_image: font_family -> FONT_MAP -> ImageFont.truetype lookup
# ---------------------------------------------------------------------------

def _make_test_image_stream():
    img = Image.new("RGB", (200, 200), color="white")
    stream = io.BytesIO()
    img.save(stream, format="PNG")
    stream.seek(0)
    return stream


@pytest.mark.parametrize("font_family", list(FONT_MAP.keys()))
@patch('PIL.ImageFont.truetype')
def test_add_text_to_image_looks_up_correct_font_file_per_family(mock_truetype, font_family):
    mock_truetype.return_value = _REAL_DEFAULT_FONT
    stream = _make_test_image_stream()

    add_text_to_image(stream, "hello", 10, 10, 24, "black", font_family=font_family)

    expected_filename = FONT_MAP[font_family]
    called_path = mock_truetype.call_args[0][0]
    assert called_path.endswith(expected_filename)
    assert os.path.join("fonts", "") in called_path or "fonts" in called_path.split(os.sep)


@patch('PIL.ImageFont.truetype')
def test_add_text_to_image_unknown_font_family_falls_back_to_arial(mock_truetype):
    mock_truetype.return_value = _REAL_DEFAULT_FONT
    stream = _make_test_image_stream()

    add_text_to_image(stream, "hello", 10, 10, 24, "black", font_family="SomeFontThatDoesNotExist")

    called_path = mock_truetype.call_args[0][0]
    assert called_path.endswith(FONT_MAP["Arial"])


@patch('PIL.ImageFont.truetype')
def test_add_text_to_image_default_font_family_is_arial(mock_truetype):
    mock_truetype.return_value = _REAL_DEFAULT_FONT
    stream = _make_test_image_stream()

    add_text_to_image(stream, "hello", 10, 10, 24, "black")  # font_family omitted

    called_path = mock_truetype.call_args[0][0]
    assert called_path.endswith(FONT_MAP["Arial"])


def _fail_only_for_custom_fonts(path, *args, **kwargs):
    """Raises IOError only for paths under our services/fonts/ directory -
    real Pillow default-font lookups (used internally by
    ImageFont.load_default() on some Pillow versions) still succeed, since
    in production only our custom .ttf could be the one that's missing."""
    if "fonts" in str(path) and ("Liberation" in str(path) or "Gelasio" in str(path)
                                  or "DejaVu" in str(path) or "Anton" in str(path)
                                  or "ComicNeue" in str(path)):
        raise IOError("font file not found on disk")
    return _REAL_DEFAULT_FONT


@patch('PIL.ImageFont.truetype', side_effect=_fail_only_for_custom_fonts)
def test_add_text_to_image_falls_back_to_default_font_if_ttf_missing(mock_truetype):
    """If the .ttf file isn't actually on disk (not yet downloaded into
    services/fonts/), this should degrade to PIL's built-in default font
    rather than raising - matching every other font-loading path in this
    file (see font_awesome_to_png)."""
    stream = _make_test_image_stream()

    # Should not raise, even though our custom font path always "fails" here.
    buf, fmt = add_text_to_image(stream, "hello", 10, 10, 24, "black", font_family="Arial")
    assert fmt == "png"
    out_img = Image.open(buf)
    assert out_img.format == "PNG"


def test_add_text_to_image_rotation_zero_draws_without_rotating_layer(tmp_path):
    """rotation=0.0 should take the simple draw.text() path, not build a
    separate rotated layer - integration-level test with real Pillow (no
    mocks) since this is the common case and worth verifying end-to-end."""
    stream = _make_test_image_stream()
    buf, fmt = add_text_to_image(stream, "hi", 5, 5, 20, "black", font_family="Arial", rotation=0.0)
    assert fmt == "png"
    out_img = Image.open(buf)
    assert out_img.size == (200, 200)  # unrotated text draws in-place, canvas size unchanged


def test_add_text_to_image_nonzero_rotation_still_produces_valid_image():
    stream = _make_test_image_stream()
    buf, fmt = add_text_to_image(stream, "hi", 5, 5, 20, "black", font_family="Arial", rotation=45.0)
    assert fmt == "png"
    out_img = Image.open(buf)
    assert out_img.format == "PNG"
