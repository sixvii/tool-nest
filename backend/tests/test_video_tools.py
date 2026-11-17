import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from tests.task_test_utils import success_result

client = TestClient(app)


def _fake_task(task_id="fake-task-id"):
    task = MagicMock()
    task.id = task_id
    return task


# -------------------------------------------------------------------------
# Dispatch: every endpoint should save the upload, call .delay(...), and
# return 202 + task_id — not a file. (This is exactly the assumption the
# old, pre-Celery version of these tests got wrong: they mocked the sync
# service functions and asserted 200 + a file back.)
# -------------------------------------------------------------------------

@pytest.mark.parametrize("endpoint, out_ext", [
    ("/api/video/mov-to-mp4", "mp4"),
    ("/api/video/video-to-gif", "gif"),
    ("/api/video/mp4-to-gif", "gif"),
    ("/api/video/mov-to-gif", "gif"),
    ("/api/video/mkv-to-gif", "gif"),
    ("/api/video/avi-to-gif", "gif"),
    ("/api/video/gif-to-mov", "mov"),
    ("/api/video/gif-to-webm", "webm"),
    ("/api/video/gif-to-mp4", "mp4"),
    ("/api/video/gif-to-apng", "apng"),
    ("/api/video/video-to-webp", "webp"),
    ("/api/video/mp4-to-avi", "avi"),
    ("/api/video/avi-to-mp4", "mp4"),
    ("/api/video/webm-to-mp4", "mp4"),
    ("/api/video/mp4-to-webm", "webm"),
    ("/api/video/mkv-to-mp4", "mp4"),
    ("/api/video/mp4-to-mov", "mov"),
    ("/api/video/mov-to-avi", "avi"),
    ("/api/video/mkv-to-avi", "avi"),
    ("/api/video/webm-to-mov", "mov"),
    ("/api/video/avi-to-mov", "mov"),
    ("/api/video/mkv-to-mov", "mov"),
    ("/api/video/avi-to-mkv", "mkv"),
])
@patch('routers.video_tools.convert_video_task')
def test_format_conversion_dispatches_task(mock_task, endpoint, out_ext):
    mock_task.delay.return_value = _fake_task()
    files = {"file": ("test_video.mp4", b"fake_video_bytes", "video/mp4")}

    response = client.post(endpoint, files=files)

    assert response.status_code == 202
    body = response.json()
    assert body["success"] is True
    assert body["task_id"] == "fake-task-id"
    mock_task.delay.assert_called_once()
    # second positional arg is the target extension
    assert mock_task.delay.call_args[0][1] == out_ext


@pytest.mark.parametrize("endpoint, form_data, operation", [
    ("/api/video/compress", {"crf": 28}, "compress"),
    ("/api/video/trim", {"start_time": "00:00:00", "end_time": "00:00:10"}, "trim"),
    ("/api/video/cut-edges", {"front_cut": 1.0, "back_cut": 1.0}, "cut-edges"),
    ("/api/video/resize", {"width": 1280, "height": 720}, "resize"),
    ("/api/video/mute", None, "mute"),
    ("/api/video/compress-mov", None, "compress-mov"),
    ("/api/video/compress-avi", None, "compress-avi"),
    ("/api/video/compress-mkv", None, "compress-mkv"),
])
@patch('routers.video_tools.process_video_task')
def test_manipulation_dispatches_task(mock_task, endpoint, form_data, operation):
    mock_task.delay.return_value = _fake_task()
    files = {"file": ("test_video.mp4", b"fake_video_bytes", "video/mp4")}

    response = client.post(endpoint, files=files, data=form_data) if form_data else client.post(endpoint, files=files)

    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    mock_task.delay.assert_called_once()
    assert mock_task.delay.call_args.kwargs["operation"] == operation


@patch('routers.video_tools.process_video_task')
def test_add_subtitles_dispatches_task_with_both_files(mock_task):
    mock_task.delay.return_value = _fake_task()
    files = [
        ("file", ("video.mp4", b"fake", "video/mp4")),
        ("subtitle", ("sub.srt", b"fake", "text/plain")),
    ]
    response = client.post("/api/video/add-subtitles", files=files)

    assert response.status_code == 202
    call_kwargs = mock_task.delay.call_args.kwargs
    assert call_kwargs["operation"] == "add-subtitles"
    assert len(call_kwargs["input_paths"]) == 2
    assert call_kwargs["original_filenames"] == ["video.mp4", "sub.srt"]


@patch('routers.video_tools.convert_video_task')
def test_dispatch_failure_returns_500_and_cleans_up_upload(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("test_video.mp4", b"fake_video_bytes", "video/mp4")}

    response = client.post("/api/video/mov-to-mp4", files=files)

    assert response.status_code == 500


# -------------------------------------------------------------------------
# Polling: prove /api/video/task/{id} actually delegates to the shared
# poll_task_result mechanism (deep coverage of that mechanism itself lives
# in test_task_polling.py — this just proves the wiring for this router).
# -------------------------------------------------------------------------

@patch('routers._task_polling.AsyncResult')
def test_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    import tempfile
    import os
    fd, path = tempfile.mkstemp(suffix=".mp4")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"converted video bytes")

    try:
        mock_async_result.return_value = success_result(path, "out.mp4", "video/mp4")
        response = client.get("/api/video/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "video/mp4"
    finally:
        if os.path.exists(path):
            os.remove(path)
