import os
import shutil
import tempfile
import uuid
import mimetypes
import asyncio
import time
from services import image_tools_service

from celery_app import celery
from services.scratch import SCRATCH_DIR
from services import (
    office_service, video_service, video_manipulation_service,
    ebook_service, audio_service, web_service,
    pdf_service, image_pdf_service,
)

OUTPUT_DIR = "/tmp/tool-nest-output"

def _set_stage(task, stage: str):
    task.update_state(state='PROGRESS', meta={'stage': stage})

def _get_media_type(filepath: str) -> str:
    content_type, _ = mimetypes.guess_type(filepath)
    return content_type or "application/octet-stream"

_OPERATIONS = {
    "word-to-pdf": (office_service.convert_word_to_pdf, "application/pdf"),
    "ppt-to-pdf": (office_service.convert_ppt_to_pdf, "application/pdf"),
    "eml-to-pdf": (office_service.convert_eml_to_pdf, "application/pdf"),
    "msg-to-pdf": (office_service.convert_msg_to_pdf, "application/pdf"),
    "pdf-to-word": (
        office_service.convert_pdf_to_word,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
    "pdf-to-ppt": (
        office_service.convert_pdf_to_ppt,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ),
}

_VIDEO_OPERATIONS = {
    "convert": video_service.convert_video,
    "compress": video_manipulation_service.compress_video,
    "trim": video_manipulation_service.trim_video,
    "cut-edges": video_manipulation_service.cut_edges_video,
    "resize": video_manipulation_service.resize_video,
    "add-subtitles": video_manipulation_service.add_subtitles,
    "mute": video_manipulation_service.mute_video,
    "compress-mov": video_manipulation_service.compress_mov,
    "compress-avi": video_manipulation_service.compress_avi,
    "compress-mkv": video_manipulation_service.compress_mkv,
}

def _run_conversion(operation: str, input_path: str, original_filename: str, task=None) -> dict:
    work_dir = None
    try:
        if operation not in _OPERATIONS:
            raise ValueError(f"Unknown conversion operation: {operation}")

        convert_fn, content_type = _OPERATIONS[operation]

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        work_dir = tempfile.mkdtemp()

        if task:
            _set_stage(task, "converting")
        with open(input_path, "rb") as f:
            result_path = convert_fn(f, original_filename, work_dir)

        if task:
            _set_stage(task, "finalizing")
        ext = os.path.splitext(result_path)[1]
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_{uuid.uuid4()}{ext}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": content_type,
        }
    finally:
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def convert_office_document(self, operation: str, input_path: str, original_filename: str) -> dict:
    try:
        return _run_conversion(operation, input_path, original_filename, task=self)
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise

_VIDEO_CONTENT_TYPES = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".apng": "image/apng",
}

def _video_content_type(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()
    return _VIDEO_CONTENT_TYPES.get(ext) or _get_media_type(filepath)

@celery.task(bind=True)
def process_video_task(self, operation: str, input_paths: list, original_filenames: list, kwargs: dict, content_type: str = None) -> dict:
    try:
        if operation not in _VIDEO_OPERATIONS:
            raise ValueError(f"Unknown video operation: {operation}")

        process_fn = _VIDEO_OPERATIONS[operation]
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        _set_stage(self, "converting")
        result_path = process_fn(*input_paths, **kwargs)

        _set_stage(self, "finalizing")
        main_filename = original_filenames[0]
        base_name, _ = os.path.splitext(main_filename)
        _, output_ext = os.path.splitext(result_path)

        output_filename = f"{base_name}_{operation}_{uuid.uuid4()}{output_ext}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": content_type or _video_content_type(final_output_path),
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        for path in input_paths:
            if os.path.exists(path):
                os.remove(path)

@celery.task(bind=True)
def convert_video_task(self, input_path: str, output_ext: str) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        _set_stage(self, "converting")
        result_path = video_service.convert_video(input_path, output_ext)

        _set_stage(self, "finalizing")
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_filename = f"{base_name}_{uuid.uuid4()}.{output_ext.lstrip('.')}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": _video_content_type(final_output_path),
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def convert_word_to_pdf(self, input_path: str, original_filename: str) -> dict:
    try:
        return _run_conversion("word-to-pdf", input_path, original_filename, task=self)
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise

_EBOOK_CONTENT_TYPES = {
    "pdf": "application/pdf",
    "epub": "application/epub+zip",
    "mobi": "application/x-mobipocket-ebook",
    "azw3": "application/vnd.amazon.ebook",
}

@celery.task(bind=True)
def convert_ebook_task(self, input_path: str, original_filename: str, output_ext: str) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    work_dir = tempfile.mkdtemp()

    try:
        _set_stage(self, "converting")
        with open(input_path, "rb") as f:
            result_path = ebook_service.convert_ebook(f, original_filename, output_ext, work_dir)

        _set_stage(self, "finalizing")
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_{uuid.uuid4()}.{output_ext}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": _EBOOK_CONTENT_TYPES.get(output_ext, _get_media_type(final_output_path)),
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def convert_audio_task(self, input_path: str, output_ext: str, content_type: str, to_video: bool = False) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    try:
        _set_stage(self, "converting")
        out_path = audio_service.process_audio(input_path, output_ext, to_video=to_video)

        _set_stage(self, "finalizing")
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_filename = f"{base_name}_{uuid.uuid4()}.{output_ext}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(out_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": content_type,
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def convert_url_to_pdf_task(self, url: str) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    work_dir = tempfile.mkdtemp()

    try:
        _set_stage(self, "rendering page")
        result_path = asyncio.run(web_service.convert_url_to_pdf(url, work_dir))

        _set_stage(self, "finalizing")
        output_filename = f"website_{uuid.uuid4()}.pdf"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": "application/pdf",
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)

@celery.task(bind=True)
def compress_pdf_task(self, input_path: str, original_filename: str, compression_level: int = 4) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        _set_stage(self, "compressing")
        with open(input_path, "rb") as f:
            result_path = pdf_service.compress_pdf(f, compression_level)

        _set_stage(self, "finalizing")
        output_filename = f"compressed_{uuid.uuid4()}_{original_filename or 'document.pdf'}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": "application/pdf",
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

_IMAGE_CONTENT_TYPES = {"jpg": "image/jpeg", "png": "image/png", "tiff": "image/tiff"}

@celery.task(bind=True)
def convert_pdf_to_images_task(self, input_path: str, original_filename: str, output_format: str) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        _set_stage(self, "rendering pages")
        with open(input_path, "rb") as f:
            result_path = image_pdf_service.convert_pdf_to_images(f, output_format)

        _set_stage(self, "finalizing")
        is_zip = result_path.endswith(".zip")
        base_name = os.path.splitext(original_filename or "document")[0]
        ext = ".zip" if is_zip else f".{output_format}"
        output_filename = f"{base_name}_{uuid.uuid4()}{ext}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": "application/zip" if is_zip else _IMAGE_CONTENT_TYPES.get(output_format, "application/octet-stream"),
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

_IMAGEMAGICK_CONTENT_TYPES = {
    "eps": "application/postscript",
    "png": "image/png",
    "jpg": "image/jpeg",
    "svg": "image/svg+xml",
}

@celery.task(bind=True)
def convert_image_magick_task(self, input_path: str, original_filename: str, target_format: str, extra_args: list = None) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        _set_stage(self, "converting")
        result_path = image_tools_service.convert_image_magick(input_path, target_format, extra_args)

        _set_stage(self, "finalizing")
        base_name = os.path.splitext(original_filename or "image")[0]
        output_filename = f"{base_name}_{uuid.uuid4()}.{target_format}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        shutil.move(result_path, final_output_path)

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": _IMAGEMAGICK_CONTENT_TYPES.get(target_format, "application/octet-stream"),
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def remove_background_task(self, input_path: str, original_filename: str, mode: str, radius: int = 15,
                           alpha_matting: bool = False) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        _set_stage(self, "loading model")
        with open(input_path, "rb") as f:
            if mode == "blur":
                buf, fmt = image_tools_service.blur_background(f, radius)
            else:
                buf, fmt = image_tools_service.remove_background(f, alpha_matting), "png"

        _set_stage(self, "finalizing")
        base_name = os.path.splitext(original_filename or "image")[0]
        output_filename = f"{base_name}_{uuid.uuid4()}.{fmt}"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        with open(final_output_path, "wb") as out_f:
            out_f.write(buf.getvalue())

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": f"image/{fmt}",
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def add_text_to_image_task(self, input_path: str, original_filename: str, text: str, x: int, y: int,
                            font_size: int, color: str, font_family: str = "Arial", rotation: float = 0.0) -> dict:
    try:
        _set_stage(self, "adding text")
        with open(input_path, "rb") as f:
            buf, fmt = image_tools_service.add_text_to_image(f, text, x, y, font_size, color, font_family, rotation)

        _set_stage(self, "finalizing")
        out_fd, out_path = tempfile.mkstemp(suffix=f".{fmt}")
        os.close(out_fd)
        with open(out_path, "wb") as out_f:
            out_f.write(buf.getvalue())

        return {
            "status": "SUCCESS",
            "result_path": out_path,
            "filename": f"with_text.{fmt}",
            "content_type": f"image/{fmt}",
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.task(bind=True)
def ocr_task(self, input_path: str, original_filename: str, mode: str) -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    try:
        _set_stage(self, "running OCR")
        with open(input_path, "rb") as f:
            if mode == "tiff":
                buf = image_tools_service.tiff_to_text(f)
            else:
                buf = image_tools_service.image_to_text(f)

        _set_stage(self, "finalizing")
        base_name = os.path.splitext(original_filename or "document")[0]
        output_filename = f"{base_name}_{uuid.uuid4()}.txt"
        final_output_path = os.path.join(OUTPUT_DIR, output_filename)
        with open(final_output_path, "w", encoding="utf-8") as out_f:
            out_f.write(buf.getvalue())

        return {
            "status": "SUCCESS",
            "result_path": final_output_path,
            "filename": output_filename,
            "content_type": "text/plain",
        }
    except Exception as e:
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
    finally:
        if os.path.exists(input_path):
            os.remove(input_path)


UPLOAD_DIR = "/tmp/tool-nest-uploads"
FILE_TTL_SECONDS = int(os.environ.get("TEMP_FILE_TTL_SECONDS", 60 * 60)) 


def _purge_stale_files(directory: str, ttl_seconds: int) -> list:
    """Deletes files in `directory` whose mtime is older than ttl_seconds.
    Returns the list of paths that were removed. Missing directory or
    per-file errors (e.g. deleted by something else in the meantime) are
    swallowed rather than failing the whole sweep."""
    removed = []
    if not os.path.isdir(directory):
        return removed

    cutoff = time.time() - ttl_seconds
    for name in os.listdir(directory):
        path = os.path.join(directory, name)
        try:
            if not os.path.isfile(path):
                continue
            if os.path.getmtime(path) < cutoff:
                os.remove(path)
                removed.append(path)
        except OSError:
            continue

    return removed


@celery.task
def cleanup_stale_files() -> dict:
    """
    Beat-scheduled sweep of the upload, output, and scratch dirs. Deletes
    anything older than FILE_TTL_SECONDS. Not a bound task (no retry state to
    report) - just runs and logs what it removed.

    SCRATCH_DIR is where every unqualified tempfile.mkstemp() lands (see
    services/scratch.py). Including it here is what reclaims the bare-temp
    orphans a synchronous service leaks when it raises after mkstemp but before
    the router can register a cleanup.
    """
    removed_uploads = _purge_stale_files(UPLOAD_DIR, FILE_TTL_SECONDS)
    removed_outputs = _purge_stale_files(OUTPUT_DIR, FILE_TTL_SECONDS)
    removed_scratch = _purge_stale_files(SCRATCH_DIR, FILE_TTL_SECONDS)

    result = {
        "removed_uploads": len(removed_uploads),
        "removed_outputs": len(removed_outputs),
        "removed_scratch": len(removed_scratch),
        "ttl_seconds": FILE_TTL_SECONDS,
    }
    print(f"[cleanup_stale_files] {result}")
    return result
