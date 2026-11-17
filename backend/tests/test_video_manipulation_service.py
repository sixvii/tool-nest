import os
import pytest
import subprocess
from unittest.mock import patch, MagicMock

from services.video_manipulation_service import (
    run_ffmpeg,
    get_video_duration,
    compress_video,
    trim_video,
    cut_edges_video,
    resize_video,
    add_subtitles,
    mute_video,
    compress_mov,
    compress_avi,
    compress_mkv
)


@patch('subprocess.run')
def test_run_ffmpeg_success(mock_run):
    # Test that FFmpeg banner-hiding flags are correctly injected
    cmd = ["ffmpeg", "-i", "input.mp4", "output.mp4"]
    run_ffmpeg(cmd)
    
    mock_run.assert_called_once()
    executed_cmd = mock_run.call_args[0][0]
    
    assert executed_cmd[0] == "ffmpeg"
    assert executed_cmd[1] == "-hide_banner"
    assert executed_cmd[2] == "-loglevel"
    assert executed_cmd[3] == "error"


@patch('subprocess.run')
def test_run_ffmpeg_failure(mock_run):
    # Simulate a failing FFmpeg process
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="ffmpeg", stderr=b"Invalid codec"
    )
    
    with pytest.raises(RuntimeError, match="FFmpeg Error: Invalid codec"):
        run_ffmpeg(["ffmpeg", "-i", "bad_input.mp4"])


@patch('subprocess.run')
def test_get_video_duration_success(mock_run):
    # Mock ffprobe returning a valid duration string
    mock_result = MagicMock()
    mock_result.returncode = 0
    mock_result.stdout = "  12.345 \n"
    mock_run.return_value = mock_result
    
    duration = get_video_duration("dummy.mp4")
    assert duration == 12.345
    
    mock_run.assert_called_once()
    executed_cmd = mock_run.call_args[0][0]
    assert executed_cmd[0] == "ffprobe"
    assert "format=duration" in executed_cmd


@patch('subprocess.run')
def test_get_video_duration_failure(mock_run):
    # Mock ffprobe failing (e.g., corrupt file)
    mock_result = MagicMock()
    mock_result.returncode = 1
    mock_result.stderr = "Invalid data found"
    mock_run.return_value = mock_result
    
    with pytest.raises(RuntimeError, match="FFprobe Error: Invalid data found"):
        get_video_duration("corrupt.mp4")


@patch('subprocess.run')
def test_compress_video(mock_run):
    out_path = None
    try:
        out_path = compress_video("dummy.mp4", 28)
        assert out_path.endswith(".mp4")
        assert os.path.exists(out_path)
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-crf" in args
        assert "28" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_trim_video(mock_run):
    out_path = None
    try:
        out_path = trim_video("dummy.mp4", "00:00:10", "00:00:20", ".mp4")
        assert os.path.exists(out_path)
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-ss" in args
        assert "00:00:10" in args
        assert "-to" in args
        assert "00:00:20" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('services.video_manipulation_service.get_video_duration')
@patch('subprocess.run')
def test_cut_edges_video_success(mock_run, mock_get_duration):
    mock_get_duration.return_value = 30.0 # 30 seconds total duration
    out_path = None
    try:
        # Cut 5 seconds from start and 5 seconds from the end (leaving 20 secs)
        out_path = cut_edges_video("dummy.mp4", 5.0, 5.0, ".mp4")
        assert os.path.exists(out_path)
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-ss" in args and "5.0" in args
        assert "-to" in args and "25.0" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('services.video_manipulation_service.get_video_duration')
def test_cut_edges_video_invalid_cuts(mock_get_duration):
    # 10 second video
    mock_get_duration.return_value = 10.0
    
    # Asking to cut 6 secs from front and 6 secs from back (12 secs total) -> raises Error
    with pytest.raises(ValueError, match="requested cuts are longer"):
        cut_edges_video("dummy.mp4", 6.0, 6.0, ".mp4")


@patch('subprocess.run')
def test_resize_video(mock_run):
    out_path = None
    try:
        out_path = resize_video("dummy.mp4", 1280, 720, ".mkv")
        assert out_path.endswith(".mkv")
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-vf" in args
        assert "scale=1280:720" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_add_subtitles(mock_run):
    out_path = None
    try:
        out_path = add_subtitles("dummy.mp4", "dummy.srt")
        assert out_path.endswith(".mkv")
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-c:s" in args
        assert "srt" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@pytest.mark.parametrize("service_func, ext", [
    (mute_video, ".mp4"),
    (compress_mov, ".mov"),
    (compress_avi, ".avi"),
    (compress_mkv, ".mkv"),
])
@patch('subprocess.run')
def test_simple_video_wrappers(mock_run, service_func, ext):
    # Test functions that primarily just wrap a specific FFmpeg command with basic tempfile creation
    out_path = service_func("dummy_input_file", ext) if service_func == mute_video else service_func("dummy")
    assert out_path.endswith(ext)
    if os.path.exists(out_path):
        os.remove(out_path)