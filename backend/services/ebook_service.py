import os
import subprocess
import shutil
import gc
from typing import IO

def convert_ebook(file_stream: IO[bytes], filename: str, output_ext: str, temp_dir: str) -> str:
    input_path = os.path.join(temp_dir, filename)
    with open(input_path, "wb") as f:
        shutil.copyfileobj(file_stream, f)

    base_name = os.path.splitext(filename)[0]
    output_filename = f"{base_name}.{output_ext}"
    output_path = os.path.join(temp_dir, output_filename)

    env = os.environ.copy()
    env["CALIBRE_TEMP_DIR"] = temp_dir 

    cmd = ["ebook-convert", input_path, output_path]

    try:
        subprocess.run(
            cmd, 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            timeout=600,
            env=env  
        )
        return output_path
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        raise RuntimeError(f"Calibre conversion error: {error_msg}")
    finally:
        gc.collect()
