import pytest
import tempfile
import os
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from tests.task_test_utils import success_result

client = TestClient(app)

@pytest.mark.parametrize("endpoint, form_data, filename, expected_suffix", [
    ("/api/image/resize", {"width": 100, "height": 100}, "img.png", ".png"),
    ("/api/image/compress", {"quality": 80}, "img.jpg", ".jpg"),
    ("/api/image/crop", {"x": 0, "y": 0, "width": 50, "height": 50}, "img.png", ".png"),
    ("/api/image/round", None, "img.png", ".png"),
    ("/api/image/black-and-white", None, "img.png", ".png"),
    ("/api/image/add-border", {"border_width": 5, "color_hex": "#000000"}, "img.png", ".png"),
    ("/api/image/pixelate", {"pixel_size": 5}, "img.png", ".png"),
    ("/api/image/flip", {"direction": "horizontal"}, "img.png", ".png"),
    ("/api/image/profile-photo-maker", {"bg_color": "#ffffff"}, "img.png", ".png"),
])

@patch('routers.image_tools.image_tools_service')
def test_image_manipulation_endpoints(mock_service, endpoint, form_data, filename, expected_suffix):
    import io
    fake_buf = io.BytesIO(b"fake_image_content")
    
    method_name = endpoint.split("/")[-1].replace("-", "_")
    
    if method_name in ["resize", "compress", "crop", "round", "flip"]:
        method_name += "_image"
    
    if endpoint in ["/api/image/compress", "/api/image/round"]:
        getattr(mock_service, method_name).return_value = fake_buf
    else:
        getattr(mock_service, method_name).return_value = (fake_buf, expected_suffix.strip("."))
    
    files = {"file": (filename, b"fake_image_bytes", "image/png")}
    response = client.post(endpoint, files=files, data=form_data) if form_data else client.post(endpoint, files=files)
        
    assert response.status_code == 200


# add-text-to-image is Celery-backed (see services/tasks.py add_text_to_image_task) —
# dispatch + poll, unlike the plain-PIL endpoints above.
#
# Positional order of the .delay(...) call in routers/image_tools.py is:
# (in_path, filename, text, x, y, font_size, color, font_family, rotation)
@patch('routers.image_tools.add_text_to_image_task')
def test_add_text_to_image_dispatches_task_with_font_family(mock_task):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    form_data = {"text": "hello", "x": 10, "y": 10, "font_family": "Georgia"}
    response = client.post("/api/image/add-text", files=files, data=form_data)

    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"

    call_args = mock_task.delay.call_args[0]
    assert call_args[2] == "hello"      # text
    assert call_args[7] == "Georgia"    # font_family


@patch('routers.image_tools.add_text_to_image_task')
def test_add_text_to_image_font_family_defaults_to_arial_when_omitted(mock_task):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    # font_family intentionally omitted from the form
    response = client.post("/api/image/add-text", files=files, data={"text": "hello", "x": 10, "y": 10})

    assert response.status_code == 202
    call_args = mock_task.delay.call_args[0]
    assert call_args[7] == "Arial"


@patch('routers.image_tools.add_text_to_image_task')
def test_add_text_to_image_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    response = client.post("/api/image/add-text", files=files, data={"text": "hello", "x": 10, "y": 10})
    assert response.status_code == 500


# blur-background/remove-background/transparent-background are Celery-backed
# (see backend context doc: rembg-based, pulled out of the sync bucket).
# remove-background and transparent-background dispatch the same task with
# different `mode` labels — preserved as separate endpoints intentionally.
@pytest.mark.parametrize("endpoint, form_data, mode", [
    ("/api/image/blur-background", {"radius": 5}, "blur"),
    ("/api/image/remove-background", None, "remove"),
    ("/api/image/transparent-background", None, "transparent"),
])
@patch('routers.image_tools.remove_background_task')
def test_background_endpoints_dispatch_task(mock_task, endpoint, form_data, mode):
    task = MagicMock()
    task.id = "fake-task-id"
    mock_task.delay.return_value = task
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    response = client.post(endpoint, files=files, data=form_data) if form_data else client.post(endpoint, files=files)
    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    # positional call: (in_path, filename, mode[, radius])
    assert mock_task.delay.call_args[0][2] == mode


@patch('routers.image_tools.remove_background_task')
def test_remove_background_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    response = client.post("/api/image/remove-background", files=files)
    assert response.status_code == 500


@patch('routers._task_polling.AsyncResult')
def test_image_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    fd, path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"fake image bytes")
    try:
        mock_async_result.return_value = success_result(path, "out.png", "image/png")
        response = client.get("/api/image/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
    finally:
        if os.path.exists(path):
            os.remove(path)

@patch('routers.image_tools.image_tools_service')
def test_image_metadata(mock_service):
    mock_service.view_metadata.return_value = {"width": 100, "height": 100}
    files = {"file": ("img.jpg", b"fake_bytes", "image/jpeg")}
    response = client.post("/api/image/view-metadata", files=files)
    assert response.status_code == 200
    assert "width" in response.json().get("metadata", {})

@patch('routers.image_tools.image_tools_service')
def test_combine_images(mock_service):
    fd, fake_out_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    mock_service.combine_images.return_value = fake_out_path
    mock_service.collage_maker.return_value = fake_out_path
    files = [("files", ("img1.jpg", b"fake_bytes1", "image/jpeg")), ("files", ("img2.jpg", b"fake_bytes2", "image/jpeg"))]
    response = client.post("/api/image/combine-images", files=files, data={"layout_type": "grid"})
    assert response.status_code == 200
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)

_EPS_BYTES = b"%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 10 10\n"

@pytest.mark.parametrize("endpoint, filename, body", [
    ("/api/convert/image/webp-to-jpg", "img.webp", b"fake_image_bytes"),
    ("/api/convert/image/png-to-jpg", "img.png", b"fake_image_bytes"),
    ("/api/convert/image/webp-to-png", "img.webp", b"fake_image_bytes"),
    ("/api/convert/image/jpg-to-png", "img.jpg", b"fake_image_bytes"),
    ("/api/convert/image/jpg-to-webp", "img.jpg", b"fake_image_bytes"),
    ("/api/convert/image/png-to-eps", "img.png", b"fake_image_bytes"),
    # EPS-input endpoints now require a valid PostScript header to pass the guard
    ("/api/convert/image/eps-to-png", "img.eps", _EPS_BYTES),
    ("/api/convert/image/eps-to-jpg", "img.eps", _EPS_BYTES),
    ("/api/convert/image/eps-to-svg", "img.eps", _EPS_BYTES),
])
@patch('routers.image_tools.image_tools_service')
def test_image_conversions(mock_service, endpoint, filename, body):
    fd, fake_out_path = tempfile.mkstemp(suffix=f".{endpoint.split('-to-')[-1]}")
    os.close(fd)
    mock_service.convert_image_format.return_value = fake_out_path
    mock_service.convert_image_magick.return_value = fake_out_path
    response = client.post(endpoint, files={"file": (filename, body, "application/octet-stream")})
    assert response.status_code == 200
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)


@pytest.mark.parametrize("endpoint", [
    "/api/convert/image/eps-to-png",
    "/api/convert/image/eps-to-jpg",
    "/api/convert/image/eps-to-svg",
])
@patch('routers.image_tools.image_tools_service')
def test_eps_endpoints_reject_non_eps(mock_service, endpoint):
    # A non-PostScript upload must be rejected with 400 before ImageMagick /
    # Ghostscript ever runs.
    response = client.post(endpoint, files={"file": ("evil.eps", b"\x89PNG not eps", "application/octet-stream")})
    assert response.status_code == 400
    assert "not a valid EPS" in response.json()["detail"]
    mock_service.convert_image_magick.assert_not_called()

@pytest.mark.parametrize("endpoint, filename", [
    ("/api/convert/image/jpg-to-avif", "img.jpg"),
    ("/api/convert/image/png-to-avif", "img.png"),
    ("/api/convert/image/webp-to-avif", "img.webp"),
    ("/api/convert/image/gif-to-avif", "img.gif"),
])
@patch('routers.image_tools.image_tools_service')
def test_image_conversions_avif(mock_service, endpoint, filename):
    import io
    fake_buf = io.BytesIO(b"fake_avif_content")
    mock_service.convert_to_avif.return_value = fake_buf
    response = client.post(endpoint, files={"file": (filename, b"fake_image_bytes", "application/octet-stream")})
    assert response.status_code == 200

@pytest.mark.parametrize("endpoint, filename", [
    ("/api/convert/image/tiff-to-jpg", "img.tiff"),
    ("/api/convert/image/tiff-to-png", "img.tiff"),
])
@patch('routers.image_tools.image_tools_service')
def test_image_conversions_tiff(mock_service, endpoint, filename):
    fd, fake_out_path = tempfile.mkstemp(suffix=f".{endpoint.split('-to-')[-1]}")
    os.close(fd) 
    mock_service.convert_tiff.return_value = (fake_out_path, False)
    response = client.post(endpoint, files={"file": (filename, b"fake_image_bytes", "application/octet-stream")})
    assert response.status_code == 200
    if os.path.exists(fake_out_path):
        os.remove(fake_out_path)

@pytest.mark.parametrize("endpoint, filename", [
    ("/api/convert/image/gif-to-jpg", "img.gif"),
    ("/api/convert/image/gif-to-png", "img.gif"),
])
@patch('routers.image_tools.image_tools_service')
def test_image_conversions_gif_frames(mock_service, endpoint, filename):
    import io
    fake_buf = io.BytesIO(b"fake_image_content")
    mock_service.extract_gif_frames.return_value = (fake_buf, False)
    response = client.post(endpoint, files={"file": (filename, b"fake_image_bytes", "application/octet-stream")})
    assert response.status_code == 200

@pytest.mark.parametrize("endpoint", [
    "/api/convert/image/jpg-to-gif",
    "/api/convert/image/png-to-gif",
    "/api/convert/image/webp-to-gif",
])
@patch('routers.image_tools.image_tools_service')
def test_image_conversions_to_gif(mock_service, endpoint):
    import io
    fake_buf = io.BytesIO(b"fake_gif_content")
    mock_service.images_to_gif.return_value = fake_buf
    files = [("files", ("img1.jpg", b"fake_bytes1", "image/jpeg")), ("files", ("img2.jpg", b"fake_bytes2", "image/jpeg"))]
    response = client.post(endpoint, files=files)
    assert response.status_code == 200

@patch('routers.image_tools.image_tools_service')
def test_jpg_to_tiff(mock_service):
    import io
    fake_buf = io.BytesIO(b"fake_tiff_content")
    mock_service.jpg_to_tiff.return_value = fake_buf
    
    files = {"file": ("img.jpg", b"fake_image_bytes", "image/jpeg")}
    response = client.post("/api/convert/image/jpg-to-tiff", files=files)
    
    assert response.status_code == 200
    assert response.content == b"fake_tiff_content"
    mock_service.jpg_to_tiff.assert_called_once()

@patch('routers.image_tools.image_tools_service')
def test_png_to_tiff(mock_service):
    import io
    fake_buf = io.BytesIO(b"fake_tiff_content")
    mock_service.png_to_tiff.return_value = fake_buf
    
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    response = client.post("/api/convert/image/png-to-tiff", files=files)
    
    assert response.status_code == 200
    assert response.content == b"fake_tiff_content"
    mock_service.png_to_tiff.assert_called_once()

@patch('routers.image_tools.image_tools_service')
def test_font_awesome_to_png(mock_service):
    import io
    fake_buf = io.BytesIO(b"fake_png_content")
    mock_service.font_awesome_to_png.return_value = fake_buf
    
    data = {"icon_unicode": "f000", "size": 100, "color": "#ff0000"}
    response = client.post("/api/image/font-awesome-to-png", data=data)
    
    assert response.status_code == 200
    assert response.content == b"fake_png_content"
    mock_service.font_awesome_to_png.assert_called_once_with("f000", 100, "#ff0000")

@patch('routers.image_tools.image_tools_service')
def test_image_tools_exception(mock_service):
    mock_service.resize_image.side_effect = Exception("Resize failed")
    files = {"file": ("img.png", b"fake_image_bytes", "image/png")}
    response = client.post("/api/image/resize", files=files, data={"width": 100, "height": 100})
    assert response.status_code == 500
