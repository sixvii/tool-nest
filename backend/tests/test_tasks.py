"""
Direct unit tests for services/tasks.py's task bodies.

These call the Celery task functions directly (e.g. tasks.convert_video_task(...))
rather than via .delay() - for a bind=True task, calling it this way still
runs the real function body with `self` bound to the task instance, but
without needing a broker/worker. The one thing that DOES try to reach Redis
if left unmocked is self.update_state() (called by _set_stage and in every
except block) - every test below patches that off via
`patch.object(tasks.<task_name>, 'update_state')`.

Two tasks (convert_office_document / process_video_task) dispatch through
module-level dicts (_OPERATIONS, _VIDEO_OPERATIONS) built at import time from
direct function references (e.g. office_service.convert_word_to_pdf) - NOT
attribute lookups done at call time. Patching services.tasks.office_service
after import has no effect on those dicts, so those two tasks are tested by
patching the dict entries themselves via patch.dict(...).

Every other task calls its service module as `module.function(...)` at
runtime, so `@patch('services.tasks.<module>')` works normally for those.
"""
import os
import io
import tempfile
import pytest
from unittest.mock import patch, MagicMock

from services import tasks


def make_input_file(suffix=".bin", content=b"input bytes"):
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    with open(path, "wb") as f:
        f.write(content)
    return path


def make_output_file(tmp_path, name, content=b"output bytes"):
    p = tmp_path / name
    p.write_bytes(content)
    return str(p)


# ---------------------------------------------------------------------------
# small helpers: _set_stage / _get_media_type / _video_content_type
# ---------------------------------------------------------------------------

def test_set_stage_calls_update_state_with_progress_and_stage():
    fake_task = MagicMock()
    tasks._set_stage(fake_task, "converting")
    fake_task.update_state.assert_called_once_with(state='PROGRESS', meta={'stage': 'converting'})


def test_get_media_type_known_extension():
    assert tasks._get_media_type("file.pdf") == "application/pdf"


def test_get_media_type_unknown_extension_falls_back_to_octet_stream():
    assert tasks._get_media_type("file.notarealext") == "application/octet-stream"


@pytest.mark.parametrize("filepath, expected", [
    ("out.mp4", "video/mp4"),
    ("out.mov", "video/quicktime"),
    ("out.avi", "video/x-msvideo"),
    ("out.mkv", "video/x-matroska"),
    ("out.webm", "video/webm"),
    ("out.gif", "image/gif"),
    ("out.webp", "image/webp"),
    ("out.apng", "image/apng"),
])
def test_video_content_type_known_extensions(filepath, expected):
    assert tasks._video_content_type(filepath) == expected


def test_video_content_type_falls_back_to_get_media_type_for_unknown_ext():
    assert tasks._video_content_type("out.txt") == "text/plain"


# ---------------------------------------------------------------------------
# convert_office_document / _run_conversion
# (dispatches through _OPERATIONS - patch.dict, not @patch on office_service)
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_office_document, 'update_state')
def test_convert_office_document_success(mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".docx")
    fake_result_path = make_output_file(tmp_path, "converted.pdf", b"pdf bytes")
    mock_convert_fn = MagicMock(return_value=fake_result_path)

    with patch.dict(tasks._OPERATIONS, {"word-to-pdf": (mock_convert_fn, "application/pdf")}):
        result = tasks.convert_office_document(operation="word-to-pdf", input_path=in_path, original_filename="doc.docx")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "application/pdf"
    assert result["result_path"].endswith(".pdf")
    assert os.path.exists(result["result_path"])
    assert not os.path.exists(in_path)  # input cleaned up
    mock_convert_fn.assert_called_once()
    # PROGRESS calls happened before any FAILURE call
    stages = [c.kwargs.get("meta", {}).get("stage") for c in mock_update_state.call_args_list if c.kwargs.get("state") == "PROGRESS"]
    assert stages == ["converting", "finalizing"]

    os.remove(result["result_path"])


@patch.object(tasks.convert_office_document, 'update_state')
def test_convert_office_document_unknown_operation_raises_value_error(mock_update_state):
    """
    _run_conversion's `if operation not in _OPERATIONS: raise ValueError(...)`
    check is now inside the same try/finally block that cleans up
    input_path, so the input file is removed even on this early-exit path
    (previously it leaked - this documents the fixed behavior).
    """
    in_path = make_input_file(suffix=".docx")
    try:
        with pytest.raises(ValueError, match="Unknown conversion operation"):
            tasks.convert_office_document(operation="not-a-real-operation", input_path=in_path, original_filename="doc.docx")
        assert not os.path.exists(in_path)  # cleaned up, no longer leaked
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)


@patch.object(tasks.convert_office_document, 'update_state')
def test_convert_office_document_failure_reports_state_and_reraises(mock_update_state):
    in_path = make_input_file(suffix=".docx")
    mock_convert_fn = MagicMock(side_effect=RuntimeError("libreoffice exploded"))

    with patch.dict(tasks._OPERATIONS, {"word-to-pdf": (mock_convert_fn, "application/pdf")}):
        with pytest.raises(RuntimeError, match="libreoffice exploded"):
            tasks.convert_office_document(operation="word-to-pdf", input_path=in_path, original_filename="doc.docx")

    mock_update_state.assert_any_call(state='FAILURE', meta={'exc_type': 'RuntimeError', 'exc_message': 'libreoffice exploded'})
    assert not os.path.exists(in_path)


# convert_word_to_pdf is the backwards-compatible wrapper around the same
# _run_conversion path - one smoke test is enough since it delegates.
@patch.object(tasks.convert_word_to_pdf, 'update_state')
def test_convert_word_to_pdf_wrapper_success(mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".docx")
    fake_result_path = make_output_file(tmp_path, "converted.pdf", b"pdf bytes")
    mock_convert_fn = MagicMock(return_value=fake_result_path)

    with patch.dict(tasks._OPERATIONS, {"word-to-pdf": (mock_convert_fn, "application/pdf")}):
        result = tasks.convert_word_to_pdf(input_path=in_path, original_filename="doc.docx")

    assert result["status"] == "SUCCESS"
    os.remove(result["result_path"])


@patch.object(tasks.convert_word_to_pdf, 'update_state')
def test_convert_word_to_pdf_wrapper_failure_reports_state_and_reraises(mock_update_state):
    in_path = make_input_file(suffix=".docx")
    mock_convert_fn = MagicMock(side_effect=RuntimeError("libreoffice exploded"))

    with patch.dict(tasks._OPERATIONS, {"word-to-pdf": (mock_convert_fn, "application/pdf")}):
        with pytest.raises(RuntimeError, match="libreoffice exploded"):
            tasks.convert_word_to_pdf(input_path=in_path, original_filename="doc.docx")

    mock_update_state.assert_any_call(state='FAILURE', meta={'exc_type': 'RuntimeError', 'exc_message': 'libreoffice exploded'})
    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# process_video_task (dispatches through _VIDEO_OPERATIONS - patch.dict)
# ---------------------------------------------------------------------------

@patch.object(tasks.process_video_task, 'update_state')
def test_process_video_task_success(mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".mp4")
    fake_result_path = make_output_file(tmp_path, "trimmed.mp4", b"video bytes")
    mock_trim_fn = MagicMock(return_value=fake_result_path)

    with patch.dict(tasks._VIDEO_OPERATIONS, {"trim": mock_trim_fn}):
        result = tasks.process_video_task(
            operation="trim", input_paths=[in_path], original_filenames=["clip.mp4"],
            kwargs={"start_time": "0", "end_time": "5"},
        )

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "video/mp4"
    assert "trim" in result["filename"]
    assert not os.path.exists(in_path)
    mock_trim_fn.assert_called_once_with(in_path, start_time="0", end_time="5")
    os.remove(result["result_path"])


@patch.object(tasks.process_video_task, 'update_state')
def test_process_video_task_explicit_content_type_overrides_guess(mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".mkv")
    fake_result_path = make_output_file(tmp_path, "out.mkv", b"video bytes")
    mock_fn = MagicMock(return_value=fake_result_path)

    with patch.dict(tasks._VIDEO_OPERATIONS, {"mute": mock_fn}):
        result = tasks.process_video_task(
            operation="mute", input_paths=[in_path], original_filenames=["clip.mkv"],
            kwargs={}, content_type="video/x-matroska",
        )

    assert result["content_type"] == "video/x-matroska"
    os.remove(result["result_path"])


@patch.object(tasks.process_video_task, 'update_state')
def test_process_video_task_unknown_operation_raises(mock_update_state):
    with pytest.raises(ValueError, match="Unknown video operation"):
        tasks.process_video_task(operation="not-real", input_paths=[], original_filenames=["x.mp4"], kwargs={})


@patch.object(tasks.process_video_task, 'update_state')
def test_process_video_task_cleans_up_all_input_paths_on_failure(mock_update_state):
    in_path1 = make_input_file(suffix=".mp4")
    in_path2 = make_input_file(suffix=".srt")
    mock_fn = MagicMock(side_effect=RuntimeError("ffmpeg died"))

    with patch.dict(tasks._VIDEO_OPERATIONS, {"add-subtitles": mock_fn}):
        with pytest.raises(RuntimeError):
            tasks.process_video_task(
                operation="add-subtitles", input_paths=[in_path1, in_path2],
                original_filenames=["clip.mp4", "subs.srt"], kwargs={},
            )

    assert not os.path.exists(in_path1)
    assert not os.path.exists(in_path2)
    mock_update_state.assert_any_call(state='FAILURE', meta={'exc_type': 'RuntimeError', 'exc_message': 'ffmpeg died'})


# ---------------------------------------------------------------------------
# convert_video_task (calls video_service.convert_video at runtime - normal @patch)
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_video_task, 'update_state')
@patch('services.tasks.video_service')
def test_convert_video_task_success(mock_video_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".mov")
    fake_result_path = make_output_file(tmp_path, "converted.mp4", b"video bytes")
    mock_video_service.convert_video.return_value = fake_result_path

    result = tasks.convert_video_task(input_path=in_path, output_ext="mp4")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "video/mp4"
    assert not os.path.exists(in_path)
    os.remove(result["result_path"])


@patch.object(tasks.convert_video_task, 'update_state')
@patch('services.tasks.video_service')
def test_convert_video_task_failure_updates_state_and_cleans_up(mock_video_service, mock_update_state):
    in_path = make_input_file(suffix=".mov")
    mock_video_service.convert_video.side_effect = RuntimeError("ffmpeg crashed")

    with pytest.raises(RuntimeError):
        tasks.convert_video_task(input_path=in_path, output_ext="mp4")

    assert not os.path.exists(in_path)
    mock_update_state.assert_any_call(state='FAILURE', meta={'exc_type': 'RuntimeError', 'exc_message': 'ffmpeg crashed'})


# ---------------------------------------------------------------------------
# convert_ebook_task
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_ebook_task, 'update_state')
@patch('services.tasks.ebook_service')
def test_convert_ebook_task_success(mock_ebook_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".epub")
    fake_result_path = make_output_file(tmp_path, "converted.pdf", b"pdf bytes")
    mock_ebook_service.convert_ebook.return_value = fake_result_path

    result = tasks.convert_ebook_task(input_path=in_path, original_filename="book.epub", output_ext="pdf")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "application/pdf"
    assert not os.path.exists(in_path)
    os.remove(result["result_path"])


@patch.object(tasks.convert_ebook_task, 'update_state')
@patch('services.tasks.ebook_service')
def test_convert_ebook_task_unknown_ext_falls_back_to_guessed_media_type(mock_ebook_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".epub")
    fake_result_path = make_output_file(tmp_path, "converted.unknownext", b"bytes")
    mock_ebook_service.convert_ebook.return_value = fake_result_path

    result = tasks.convert_ebook_task(input_path=in_path, original_filename="book.epub", output_ext="unknownext")

    assert result["content_type"] == "application/octet-stream"
    os.remove(result["result_path"])


@patch.object(tasks.convert_ebook_task, 'update_state')
@patch('services.tasks.ebook_service')
def test_convert_ebook_task_failure_cleans_up(mock_ebook_service, mock_update_state):
    in_path = make_input_file(suffix=".epub")
    mock_ebook_service.convert_ebook.side_effect = RuntimeError("calibre exploded")

    with pytest.raises(RuntimeError):
        tasks.convert_ebook_task(input_path=in_path, original_filename="book.epub", output_ext="pdf")

    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# convert_audio_task
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_audio_task, 'update_state')
@patch('services.tasks.audio_service')
def test_convert_audio_task_success(mock_audio_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".mp4")
    fake_result_path = make_output_file(tmp_path, "audio.mp3", b"audio bytes")
    mock_audio_service.process_audio.return_value = fake_result_path

    result = tasks.convert_audio_task(input_path=in_path, output_ext="mp3", content_type="audio/mpeg")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "audio/mpeg"
    assert not os.path.exists(in_path)
    mock_audio_service.process_audio.assert_called_once_with(in_path, "mp3", to_video=False)
    os.remove(result["result_path"])


@patch.object(tasks.convert_audio_task, 'update_state')
@patch('services.tasks.audio_service')
def test_convert_audio_task_to_video_passes_flag_through(mock_audio_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".m4a")
    fake_result_path = make_output_file(tmp_path, "out.mp4", b"video bytes")
    mock_audio_service.process_audio.return_value = fake_result_path

    tasks.convert_audio_task(input_path=in_path, output_ext="mp4", content_type="video/mp4", to_video=True)

    mock_audio_service.process_audio.assert_called_once_with(in_path, "mp4", to_video=True)


@patch.object(tasks.convert_audio_task, 'update_state')
@patch('services.tasks.audio_service')
def test_convert_audio_task_failure_cleans_up(mock_audio_service, mock_update_state):
    in_path = make_input_file(suffix=".mp4")
    mock_audio_service.process_audio.side_effect = RuntimeError("ffmpeg died")

    with pytest.raises(RuntimeError):
        tasks.convert_audio_task(input_path=in_path, output_ext="mp3", content_type="audio/mpeg")

    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# convert_url_to_pdf_task (async web_service call, driven via asyncio.run)
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_url_to_pdf_task, 'update_state')
@patch('services.tasks.web_service')
def test_convert_url_to_pdf_task_success(mock_web_service, mock_update_state, tmp_path):
    fake_result_path = make_output_file(tmp_path, "page.pdf", b"pdf bytes")

    async def fake_convert(url, work_dir):
        return fake_result_path

    mock_web_service.convert_url_to_pdf = fake_convert

    result = tasks.convert_url_to_pdf_task(url="https://example.com")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "application/pdf"
    assert result["filename"].startswith("website_")
    os.remove(result["result_path"])


@patch.object(tasks.convert_url_to_pdf_task, 'update_state')
@patch('services.tasks.web_service')
def test_convert_url_to_pdf_task_failure_reports_state(mock_web_service, mock_update_state):
    async def fake_convert(url, work_dir):
        raise RuntimeError("playwright timed out")

    mock_web_service.convert_url_to_pdf = fake_convert

    with pytest.raises(RuntimeError, match="playwright timed out"):
        tasks.convert_url_to_pdf_task(url="https://example.com")

    mock_update_state.assert_any_call(state='FAILURE', meta={'exc_type': 'RuntimeError', 'exc_message': 'playwright timed out'})


# ---------------------------------------------------------------------------
# compress_pdf_task
# ---------------------------------------------------------------------------

@patch.object(tasks.compress_pdf_task, 'update_state')
@patch('services.tasks.pdf_service')
def test_compress_pdf_task_success(mock_pdf_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".pdf")
    fake_result_path = make_output_file(tmp_path, "compressed.pdf", b"pdf bytes")
    mock_pdf_service.compress_pdf.return_value = fake_result_path

    result = tasks.compress_pdf_task(input_path=in_path, original_filename="doc.pdf", compression_level=3)

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "application/pdf"
    assert not os.path.exists(in_path)
    mock_pdf_service.compress_pdf.assert_called_once()
    assert mock_pdf_service.compress_pdf.call_args[0][1] == 3
    os.remove(result["result_path"])


@patch.object(tasks.compress_pdf_task, 'update_state')
@patch('services.tasks.pdf_service')
def test_compress_pdf_task_failure_cleans_up(mock_pdf_service, mock_update_state):
    in_path = make_input_file(suffix=".pdf")
    mock_pdf_service.compress_pdf.side_effect = RuntimeError("ghostscript timed out")

    with pytest.raises(RuntimeError):
        tasks.compress_pdf_task(input_path=in_path, original_filename="doc.pdf")

    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# convert_pdf_to_images_task
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_pdf_to_images_task, 'update_state')
@patch('services.tasks.image_pdf_service')
def test_convert_pdf_to_images_task_single_page(mock_image_pdf_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".pdf")
    fake_result_path = make_output_file(tmp_path, "page.jpg", b"jpg bytes")
    mock_image_pdf_service.convert_pdf_to_images.return_value = fake_result_path

    result = tasks.convert_pdf_to_images_task(input_path=in_path, original_filename="doc.pdf", output_format="jpg")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "image/jpeg"
    assert not os.path.exists(in_path)
    os.remove(result["result_path"])


@patch.object(tasks.convert_pdf_to_images_task, 'update_state')
@patch('services.tasks.image_pdf_service')
def test_convert_pdf_to_images_task_multi_page_zip(mock_image_pdf_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".pdf")
    fake_result_path = make_output_file(tmp_path, "pages.zip", b"zip bytes")
    mock_image_pdf_service.convert_pdf_to_images.return_value = fake_result_path

    result = tasks.convert_pdf_to_images_task(input_path=in_path, original_filename="doc.pdf", output_format="png")

    assert result["content_type"] == "application/zip"
    assert result["filename"].endswith(".zip")
    os.remove(result["result_path"])


@patch.object(tasks.convert_pdf_to_images_task, 'update_state')
@patch('services.tasks.image_pdf_service')
def test_convert_pdf_to_images_task_failure_cleans_up(mock_image_pdf_service, mock_update_state):
    in_path = make_input_file(suffix=".pdf")
    mock_image_pdf_service.convert_pdf_to_images.side_effect = RuntimeError("poppler failed")

    with pytest.raises(RuntimeError):
        tasks.convert_pdf_to_images_task(input_path=in_path, original_filename="doc.pdf", output_format="png")

    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# convert_image_magick_task (EPS conversions)
# ---------------------------------------------------------------------------

@patch.object(tasks.convert_image_magick_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_convert_image_magick_task_success(mock_image_tools_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".png")
    fake_result_path = make_output_file(tmp_path, "out.eps", b"eps bytes")
    mock_image_tools_service.convert_image_magick.return_value = fake_result_path

    result = tasks.convert_image_magick_task(input_path=in_path, original_filename="img.png", target_format="eps")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "application/postscript"
    assert not os.path.exists(in_path)
    os.remove(result["result_path"])


@patch.object(tasks.convert_image_magick_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_convert_image_magick_task_unknown_format_falls_back(mock_image_tools_service, mock_update_state, tmp_path):
    in_path = make_input_file(suffix=".png")
    fake_result_path = make_output_file(tmp_path, "out.weird", b"bytes")
    mock_image_tools_service.convert_image_magick.return_value = fake_result_path

    result = tasks.convert_image_magick_task(input_path=in_path, original_filename="img.png", target_format="weird")

    assert result["content_type"] == "application/octet-stream"
    os.remove(result["result_path"])


@patch.object(tasks.convert_image_magick_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_convert_image_magick_task_failure_cleans_up(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.convert_image_magick.side_effect = RuntimeError("imagemagick error")

    with pytest.raises(RuntimeError):
        tasks.convert_image_magick_task(input_path=in_path, original_filename="img.png", target_format="eps")

    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# remove_background_task (mode: remove / transparent / blur)
# ---------------------------------------------------------------------------

@patch.object(tasks.remove_background_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_remove_background_task_remove_mode(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.remove_background.return_value = io.BytesIO(b"png bytes")

    result = tasks.remove_background_task(input_path=in_path, original_filename="img.png", mode="remove")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "image/png"
    assert os.path.exists(result["result_path"])
    assert not os.path.exists(in_path)
    mock_image_tools_service.remove_background.assert_called_once()
    mock_image_tools_service.blur_background.assert_not_called()
    os.remove(result["result_path"])


@patch.object(tasks.remove_background_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_remove_background_task_transparent_mode_calls_same_fn_as_remove(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.remove_background.return_value = io.BytesIO(b"png bytes")

    result = tasks.remove_background_task(input_path=in_path, original_filename="img.png", mode="transparent")

    assert result["status"] == "SUCCESS"
    mock_image_tools_service.remove_background.assert_called_once()
    os.remove(result["result_path"])


@patch.object(tasks.remove_background_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_remove_background_task_blur_mode_passes_radius(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.blur_background.return_value = (io.BytesIO(b"png bytes"), "png")

    result = tasks.remove_background_task(input_path=in_path, original_filename="img.png", mode="blur", radius=25)

    assert result["status"] == "SUCCESS"
    mock_image_tools_service.blur_background.assert_called_once()
    assert mock_image_tools_service.blur_background.call_args[0][1] == 25
    mock_image_tools_service.remove_background.assert_not_called()
    os.remove(result["result_path"])


@patch.object(tasks.remove_background_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_remove_background_task_failure_cleans_up(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.remove_background.side_effect = RuntimeError("rembg model error")

    with pytest.raises(RuntimeError):
        tasks.remove_background_task(input_path=in_path, original_filename="img.png", mode="remove")

    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# add_text_to_image_task
# ---------------------------------------------------------------------------

@patch.object(tasks.add_text_to_image_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_add_text_to_image_task_success(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.add_text_to_image.return_value = (io.BytesIO(b"png bytes"), "png")

    result = tasks.add_text_to_image_task(
        input_path=in_path, original_filename="img.png", text="hello", x=10, y=10,
        font_size=24, color="black", font_family="Georgia", rotation=0.0,
    )

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "image/png"
    assert result["filename"] == "with_text.png"
    assert os.path.exists(result["result_path"])
    assert not os.path.exists(in_path)
    mock_image_tools_service.add_text_to_image.assert_called_once()
    # positional call into the service fn: (f, text, x, y, font_size, color, font_family, rotation)
    call_args = mock_image_tools_service.add_text_to_image.call_args[0]
    assert call_args[6] == "Georgia"
    os.remove(result["result_path"])


@patch.object(tasks.add_text_to_image_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_add_text_to_image_task_defaults_font_family_to_arial(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.add_text_to_image.return_value = (io.BytesIO(b"png bytes"), "png")

    tasks.add_text_to_image_task(
        input_path=in_path, original_filename="img.png", text="hello", x=10, y=10,
        font_size=24, color="black",
    )

    call_args = mock_image_tools_service.add_text_to_image.call_args[0]
    assert call_args[6] == "Arial"


@patch.object(tasks.add_text_to_image_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_add_text_to_image_task_failure_reports_error_meta_and_cleans_up(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.add_text_to_image.side_effect = RuntimeError("font not found")

    with pytest.raises(RuntimeError):
        tasks.add_text_to_image_task(
            input_path=in_path, original_filename="img.png", text="hello", x=10, y=10,
            font_size=24, color="black",
        )

    # This task's failure meta shape was standardized to match every other
    # task's ({'exc_type': ..., 'exc_message': ...}) - it previously used a
    # different shape ({"error": ...}), which was an inconsistency, not an
    # intentional design choice.
    mock_update_state.assert_any_call(
        state='FAILURE', meta={'exc_type': 'RuntimeError', 'exc_message': 'font not found'}
    )
    assert not os.path.exists(in_path)


# ---------------------------------------------------------------------------
# ocr_task (mode: image / tiff)
# ---------------------------------------------------------------------------

@patch.object(tasks.ocr_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_ocr_task_image_mode(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.image_to_text.return_value = io.StringIO("hello world")

    result = tasks.ocr_task(input_path=in_path, original_filename="img.png", mode="image")

    assert result["status"] == "SUCCESS"
    assert result["content_type"] == "text/plain"
    with open(result["result_path"], encoding="utf-8") as f:
        assert f.read() == "hello world"
    assert not os.path.exists(in_path)
    mock_image_tools_service.image_to_text.assert_called_once()
    mock_image_tools_service.tiff_to_text.assert_not_called()
    os.remove(result["result_path"])


@patch.object(tasks.ocr_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_ocr_task_tiff_mode(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".tiff")
    mock_image_tools_service.tiff_to_text.return_value = io.StringIO("page 1 text")

    result = tasks.ocr_task(input_path=in_path, original_filename="scan.tiff", mode="tiff")

    assert result["status"] == "SUCCESS"
    mock_image_tools_service.tiff_to_text.assert_called_once()
    mock_image_tools_service.image_to_text.assert_not_called()
    os.remove(result["result_path"])


@patch.object(tasks.ocr_task, 'update_state')
@patch('services.tasks.image_tools_service')
def test_ocr_task_failure_cleans_up(mock_image_tools_service, mock_update_state):
    in_path = make_input_file(suffix=".png")
    mock_image_tools_service.image_to_text.side_effect = RuntimeError("tesseract not found")

    with pytest.raises(RuntimeError):
        tasks.ocr_task(input_path=in_path, original_filename="img.png", mode="image")

    assert not os.path.exists(in_path)
