import os
import subprocess
import tempfile
import gc

def run_ffmpeg_audio(cmd: list) -> None:
    if cmd[0] == "ffmpeg":
        cmd[1:1] = ["-hide_banner", "-loglevel", "error"]
        
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=600)
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        raise RuntimeError(f"FFmpeg Error: {error_msg}")
    finally:
        gc.collect()

def process_audio(in_path: str, out_ext: str, to_video: bool = False) -> str:
    fd, out_path = tempfile.mkstemp(suffix=f".{out_ext}")
    os.close(fd)
    
    try:
        if to_video:
            cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=30", "-i", in_path, "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "192k", "-pix_fmt", "yuv420p", "-shortest", out_path]
        elif out_ext == "m4r":
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-c:a", "aac", "-b:a", "192k", "-f", "ipod", out_path]
        elif out_ext == "mp3":
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-c:a", "libmp3lame", "-q:a", "2", out_path]
        elif out_ext == "wav":
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-c:a", "pcm_s16le", out_path]
        elif out_ext == "ogg":
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-c:a", "libvorbis", "-q:a", "4", out_path]
        elif out_ext == "flac":
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", "-c:a", "flac", out_path]
        else:
            cmd = ["ffmpeg", "-y", "-i", in_path, "-vn", out_path]
            
        run_ffmpeg_audio(cmd)
        return out_path
    except Exception:
        if os.path.exists(out_path):
            os.remove(out_path)
        raise