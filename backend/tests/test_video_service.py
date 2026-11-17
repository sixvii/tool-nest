import os
import pytest
import subprocess
from unittest.mock import patch, MagicMock

from services.video_service import convert_video


@patch('subprocess.run')
def test_convert_video_webp(mock_run):
    out_path = None
    try:
        out_path = convert_video("dummy_input.mp4", "webp")
        assert out_path.endswith(".webp")
        assert os.path.exists(out_path)
        
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "ffmpeg" in args
        assert "-vcodec" in args
        assert "libwebp" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_convert_video_gif(mock_run):
    out_path = None
    try:
        out_path = convert_video("dummy_input.mp4", "gif")
        assert out_path.endswith(".gif")
        
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-vf" in args
        assert "fps=8,scale=480:-1" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_convert_video_mp4_copy(mock_run):
    out_path = None
    try:
        out_path = convert_video("dummy_input.avi", "mp4")
        assert out_path.endswith(".mp4")
        
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert "-c" in args
        assert "copy" in args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_convert_video_fallback_success(mock_run):
    # Simulate a stream copy failure on the first FFmpeg call, 
    # followed by a successful re-encode on the fallback call
    mock_run.side_effect = [
        subprocess.CalledProcessError(returncode=1, cmd="ffmpeg", stderr=b"copy failed incompatible codec"),
        MagicMock() # Success on second call
    ]
    
    out_path = None
    try:
        out_path = convert_video("dummy_input.mkv", "avi")
        assert out_path.endswith(".avi")
        assert mock_run.call_count == 2
        
        fallback_args = mock_run.call_args_list[1][0][0]
        assert "-preset" in fallback_args
        assert "ultrafast" in fallback_args
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('subprocess.run')
def test_convert_video_fallback_failure(mock_run):
    # Simulate both the primary and fallback FFmpeg calls failing
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="ffmpeg", stderr=b"fatal encoding error"
    )
    
    # The service function cleans up the temp file internally when it raises an exception
    with pytest.raises(RuntimeError, match="FFmpeg fallback conversion error: fatal encoding error"):
        convert_video("dummy_input.mov", "mp4")
        
    assert mock_run.call_count == 2


@patch('subprocess.run')
def test_convert_video_standard_failure(mock_run):
    # Simulate a failure for a format that doesn't have a fallback mechanism (e.g., webp)
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="ffmpeg", stderr=b"webp conversion failed"
    )
    
    # The service function cleans up the temp file internally when it raises an exception
    with pytest.raises(RuntimeError, match="FFmpeg error: webp conversion failed"):
        convert_video("dummy_input.mp4", "webp")
        
    assert mock_run.call_count == 1