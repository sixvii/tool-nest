import os
import subprocess
import tempfile
import gc

def run_ffmpeg(cmd: list) -> None:
    if cmd[0] == "ffmpeg":
        cmd[1:1] = ["-hide_banner", "-loglevel", "error"]
        
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        raise RuntimeError(f"FFmpeg Error: {error_msg}")
    finally:
        gc.collect()

def _create_temp(suffix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    return path

def get_video_duration(in_path: str) -> float:
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of",
        "default=noprint_wrappers=1:nokey=1", in_path
    ]
    # timeout so a malformed/streaming file can't hang ffprobe forever (which,
    # inside a task, would pin a worker slot until the Celery hard time limit).
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"FFprobe Error: {result.stderr.strip()}")
    return float(result.stdout.strip())

def compress_video(in_path: str, crf: int) -> str:
    out_path = _create_temp(".mp4")
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-vcodec", "libx264", "-crf", str(crf), "-preset", "fast", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out_path])
    return out_path

def trim_video(in_path: str, start_time: str, end_time: str, ext: str) -> str:
    out_path = _create_temp(ext)
    # -ss placed before -i ensures extremely fast keyframe seeking
    run_ffmpeg(["ffmpeg", "-y", "-ss", start_time, "-to", end_time, "-i", in_path, "-c", "copy", out_path])
    return out_path

def cut_edges_video(in_path: str, front_cut: float, back_cut: float, ext: str) -> str:
    duration = get_video_duration(in_path)
    end_time = duration - back_cut
    
    if end_time <= front_cut:
        raise ValueError("The requested cuts are longer than the video's total duration!")
        
    out_path = _create_temp(ext)
    run_ffmpeg(["ffmpeg", "-y", "-ss", str(front_cut), "-to", str(end_time), "-i", in_path, "-c", "copy", out_path])
    return out_path

def resize_video(in_path: str, width: int, height: int, ext: str) -> str:
    out_path = _create_temp(ext)
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-vf", f"scale={width}:{height}", "-c:a", "copy", out_path])
    return out_path

def add_subtitles(in_path: str, srt_path: str) -> str:
    out_path = _create_temp(".mkv") 
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-i", srt_path, "-c", "copy", "-c:s", "srt", out_path])
    return out_path

def mute_video(in_path: str, ext: str) -> str:
    out_path = _create_temp(ext)
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-c:v", "copy", "-an", out_path])
    return out_path

def compress_mov(in_path: str) -> str:
    out_path = _create_temp(".mov")
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-vcodec", "libx264", "-crf", "28", "-preset", "fast", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out_path])
    return out_path

def compress_avi(in_path: str) -> str:
    out_path = _create_temp(".avi")
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-vcodec", "mpeg4", "-vtag", "xvid", "-qscale:v", "5", "-c:a", "libmp3lame", out_path])
    return out_path

def compress_mkv(in_path: str) -> str:
    out_path = _create_temp(".mkv")
    run_ffmpeg(["ffmpeg", "-y", "-i", in_path, "-vcodec", "libx265", "-crf", "28", "-preset", "fast", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", out_path])
    return out_path