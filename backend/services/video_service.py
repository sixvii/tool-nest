import os
import subprocess
import tempfile
import gc

def convert_video(input_path: str, output_ext: str) -> str:
    out_fd, out_path = tempfile.mkstemp(suffix=f".{output_ext}")
    os.close(out_fd)
    
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", 
        "-i", input_path,
        "-max_muxing_queue_size", "1024"  
    ]
    
    if output_ext == "webp":
        cmd.extend([
            "-vcodec", "libwebp", 
            "-lossless", "0", 
            "-loop", "0",
            "-vf", "scale=-1:480,fps=15"
        ])
    elif output_ext == "gif":
        cmd.extend([
            "-vf", "fps=8,scale=480:-1", 
            "-loop", "0"
        ])
    elif output_ext in ["mp4", "mkv", "mov", "avi"]:
        cmd.extend(["-c", "copy"])
        if output_ext == "mp4":
            cmd.extend(["-movflags", "+faststart"])
        
    cmd.append(out_path)
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
        return out_path
    except subprocess.CalledProcessError as e:
        error_msg_e = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        
        if "moov atom not found" in error_msg_e or "Invalid data found when processing input" in error_msg_e:
            if os.path.exists(out_path):
                os.remove(out_path)
            raise ValueError(f"Invalid input file: The file may be corrupt or not finalized correctly. FFmpeg error: {error_msg_e.strip()}")

        if output_ext in ["mp4", "mkv", "mov", "avi"]:
            fallback_cmd = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", 
                "-i", input_path, 
                "-preset", "ultrafast"
            ]
            if output_ext == "mp4":
                fallback_cmd.extend(["-movflags", "+faststart"])
            fallback_cmd.append(out_path)
            try:
                subprocess.run(fallback_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
                return out_path
            except subprocess.CalledProcessError as fallback_err:
                if os.path.exists(out_path):
                    os.remove(out_path)
                error_msg = fallback_err.stderr.decode('utf-8', errors='ignore') if fallback_err.stderr else str(fallback_err)
                raise RuntimeError(f"FFmpeg fallback conversion error: {error_msg}")
        else:
            if os.path.exists(out_path):
                os.remove(out_path)
            raise RuntimeError(f"FFmpeg error: {error_msg_e}")
    finally:
        gc.collect()