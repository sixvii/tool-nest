import os
import pytest
import tempfile
import subprocess
from unittest.mock import patch

from services.audio_service import run_ffmpeg_audio, process_audio


@patch('subprocess.run')
def test_run_ffmpeg_audio_success(mock_run):
    cmd = ["ffmpeg", "-y", "-i", "input.mp3", "output.wav"]
    run_ffmpeg_audio(cmd)
    
    mock_run.assert_called_once()
    executed_cmd = mock_run.call_args[0][0]
    
    assert executed_cmd[0] == "ffmpeg"
    assert executed_cmd[1] == "-hide_banner"
    assert executed_cmd[2] == "-loglevel"
    assert executed_cmd[3] == "error"


@patch('subprocess.run')
def test_run_ffmpeg_audio_failure(mock_run):
    mock_run.side_effect = subprocess.CalledProcessError(
        returncode=1, cmd="ffmpeg", stderr=b"Invalid audio format"
    )
    
    with pytest.raises(RuntimeError, match="FFmpeg Error: Invalid audio format"):
        run_ffmpeg_audio(["ffmpeg", "-i", "bad.mp3"])


@pytest.mark.parametrize("out_ext, to_video, expected_flags", [
    ("mp4", True, ["-f", "lavfi", "-i", "color=c=black:s=1280x720:r=30", "-c:v", "libx264"]),
    ("m4r", False, ["-vn", "-c:a", "aac", "-b:a", "192k"]),
    ("mp3", False, ["-vn", "-c:a", "libmp3lame", "-q:a", "2"]),
    ("wav", False, ["-vn", "-c:a", "pcm_s16le"]),
    ("ogg", False, ["-vn", "-c:a", "libvorbis", "-q:a", "4"]),
    ("flac", False, ["-vn", "-c:a", "flac"]),
    ("aac", False, ["-vn", "-y"]), # Default fallback branch
])
@patch('subprocess.run')
def test_process_audio_cases(mock_run, out_ext, to_video, expected_flags):
    out_path = None
    try:
        out_path = process_audio("dummy_input.wav", out_ext, to_video=to_video)
        
        assert out_path.endswith(f".{out_ext}")
        assert os.path.exists(out_path)
        
        mock_run.assert_called_once()
        executed_cmd = mock_run.call_args[0][0]
        
        # Verify the base ffmpeg flags were injected
        assert executed_cmd[0] == "ffmpeg"
        assert "-hide_banner" in executed_cmd
        
        # Verify format specific flags
        for flag in expected_flags:
            assert flag in executed_cmd
    finally:
        if out_path and os.path.exists(out_path):
            os.remove(out_path)


@patch('services.audio_service.run_ffmpeg_audio')
def test_process_audio_cleanup_on_error(mock_run_ffmpeg_audio):
    mock_run_ffmpeg_audio.side_effect = RuntimeError("Fake Error")
    
    # Create a side_effect wrapped mkstemp so we can track the file and ensure it was deleted
    original_mkstemp = tempfile.mkstemp
    created_paths = []
    
    def side_effect_mkstemp(*args, **kwargs):
        fd, path = original_mkstemp(*args, **kwargs)
        created_paths.append(path)
        return fd, path

    with patch('tempfile.mkstemp', side_effect=side_effect_mkstemp):
        with pytest.raises(RuntimeError, match="Fake Error"):
            process_audio("dummy.wav", "mp3")
            
    assert len(created_paths) == 1
    assert not os.path.exists(created_paths[0])