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


@pytest.mark.parametrize("endpoint, form_data, filename, out_ext, to_video", [
    ("/api/audio/extract-audio", {"format": "mp3"}, "video.mp4", "mp3", False),
    ("/api/audio/mp4-to-mp3", None, "video.mp4", "mp3", False),
    ("/api/audio/mov-to-mp3", None, "video.mov", "mp3", False),
    ("/api/audio/mkv-to-mp3", None, "video.mkv", "mp3", False),
    ("/api/audio/webm-to-mp3", None, "video.webm", "mp3", False),
    ("/api/audio/avi-to-mp3", None, "video.avi", "mp3", False),
    ("/api/audio/mp4-to-wav", None, "video.mp4", "wav", False),
    ("/api/audio/mov-to-wav", None, "video.mov", "wav", False),
    ("/api/audio/m4a-to-mp3", None, "audio.m4a", "mp3", False),
    ("/api/audio/ogg-to-mp3", None, "audio.ogg", "mp3", False),
    ("/api/audio/aac-to-mp3", None, "audio.aac", "mp3", False),
    ("/api/audio/m4a-to-wav", None, "audio.m4a", "wav", False),
    ("/api/audio/ogg-to-wav", None, "audio.ogg", "wav", False),
    ("/api/audio/aac-to-wav", None, "audio.aac", "wav", False),
    ("/api/audio/aac-to-flac", None, "audio.aac", "flac", False),
    ("/api/audio/aac-to-m4r", None, "audio.aac", "m4r", False),
    ("/api/audio/m4a-to-mp4", None, "audio.m4a", "mp4", True),
    ("/api/audio/aac-to-mp4", None, "audio.aac", "mp4", True),
    ("/api/audio/mp4-to-ogg", None, "video.mp4", "ogg", False),
])
@patch('routers.audio_tools.convert_audio_task')
def test_dispatches_task_and_returns_202(mock_task, endpoint, form_data, filename, out_ext, to_video):
    mock_task.delay.return_value = _fake_task()
    files = {"file": (filename, b"fake_audio_video_bytes", "application/octet-stream")}

    response = client.post(endpoint, files=files, data=form_data) if form_data else client.post(endpoint, files=files)

    assert response.status_code == 202
    body = response.json()
    assert body["task_id"] == "fake-task-id"
    call_kwargs = mock_task.delay.call_args.kwargs
    assert call_kwargs["output_ext"] == out_ext
    assert call_kwargs["to_video"] == to_video


@patch('routers.audio_tools.convert_audio_task')
def test_dispatch_failure_returns_500(mock_task):
    mock_task.delay.side_effect = Exception("broker unreachable")
    files = {"file": ("video.mp4", b"fake_bytes", "video/mp4")}
    response = client.post("/api/audio/mp4-to-mp3", files=files)
    assert response.status_code == 500


@patch('routers._task_polling.AsyncResult')
def test_task_endpoint_delegates_to_poll_task_result(mock_async_result):
    import tempfile
    import os
    fd, path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)
    with open(path, "wb") as f:
        f.write(b"converted audio bytes")

    try:
        mock_async_result.return_value = success_result(path, "out.mp3", "audio/mpeg")
        response = client.get("/api/audio/task/some-task-id")
        assert response.status_code == 200
        assert response.headers["content-type"] == "audio/mpeg"
    finally:
        if os.path.exists(path):
            os.remove(path)
