import os
import shutil
import tempfile
import gc
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, HTTPException, Form
from fastapi.responses import JSONResponse

from services.tasks import convert_video_task, process_video_task
from routers._task_polling import poll_task_result

router = APIRouter(prefix="/api/video", tags=["Video Format Conversions"])


def cleanup_files(in_path: str, out_path: str = None):
    if in_path and os.path.exists(in_path):
        os.remove(in_path)
    if out_path and os.path.exists(out_path):
        os.remove(out_path)
    gc.collect()


def save_upload(upload_file: UploadFile) -> str:
    _, ext = os.path.splitext(upload_file.filename or "")
    fd, path = tempfile.mkstemp(suffix=ext or ".tmp", dir="/tmp")
    with os.fdopen(fd, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return path


def get_media_type(ext: str) -> str:
    return {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
        ".webm": "video/webm",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".apng": "image/apng"
    }.get(ext.lower(), "application/octet-stream")


def parse_time_to_seconds(time_str: str) -> float:
    try:
        parts = time_str.split(':')
        if len(parts) == 3:
            return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return float(parts[0]) * 60 + float(parts[1])
        return float(time_str)
    except ValueError:
        raise ValueError(f"Invalid time format: {time_str}")


def handle_conversion(file: UploadFile, out_ext: str) -> JSONResponse:
    in_path = save_upload(file)
    try:
        task = convert_video_task.delay(in_path, out_ext)
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Video conversion started."}
        )
    except Exception as e:
        cleanup_files(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start conversion task: {e}")


def handle_manipulation(operation: str, file: UploadFile, kwargs: dict, content_type: str = None,
                         extra_files: list = None) -> JSONResponse:
    in_path = save_upload(file)
    input_paths = [in_path]
    original_filenames = [file.filename or "video"]

    if extra_files:
        for extra in extra_files:
            extra_path = save_upload(extra)
            input_paths.append(extra_path)
            original_filenames.append(extra.filename or "file")

    try:
        task = process_video_task.delay(
            operation=operation,
            input_paths=input_paths,
            original_filenames=original_filenames,
            kwargs=kwargs,
            content_type=content_type,
        )
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": f"Video {operation} started."}
        )
    except Exception as e:
        for p in input_paths:
            if os.path.exists(p):
                os.remove(p)
        raise HTTPException(status_code=500, detail=f"Failed to start {operation} task: {e}")


@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/mov-to-mp4")
def mov_to_mp4(file: UploadFile = File(...)):
    return handle_conversion(file, "mp4")

@router.post("/video-to-gif")
def video_to_gif(file: UploadFile = File(...)):
    return handle_conversion(file, "gif")

@router.post("/mp4-to-gif")
def mp4_to_gif(file: UploadFile = File(...)):
    return handle_conversion(file, "gif")

@router.post("/mov-to-gif")
def mov_to_gif(file: UploadFile = File(...)):
    return handle_conversion(file, "gif")

@router.post("/mkv-to-gif")
def mkv_to_gif(file: UploadFile = File(...)):
    return handle_conversion(file, "gif")

@router.post("/avi-to-gif")
def avi_to_gif(file: UploadFile = File(...)):
    return handle_conversion(file, "gif")

@router.post("/gif-to-mov")
def gif_to_mov(file: UploadFile = File(...)):
    return handle_conversion(file, "mov")

@router.post("/gif-to-webm")
def gif_to_webm(file: UploadFile = File(...)):
    return handle_conversion(file, "webm")

@router.post("/gif-to-mp4")
def gif_to_mp4(file: UploadFile = File(...)):
    return handle_conversion(file, "mp4")

@router.post("/gif-to-apng")
def gif_to_apng(file: UploadFile = File(...)):
    return handle_conversion(file, "apng")

@router.post("/video-to-webp")
def video_to_webp(file: UploadFile = File(...)):
    return handle_conversion(file, "webp")

@router.post("/mp4-to-avi")
def mp4_to_avi(file: UploadFile = File(...)):
    return handle_conversion(file, "avi")

@router.post("/avi-to-mp4")
def avi_to_mp4(file: UploadFile = File(...)):
    return handle_conversion(file, "mp4")

@router.post("/webm-to-mp4")
def webm_to_mp4(file: UploadFile = File(...)):
    return handle_conversion(file, "mp4")

@router.post("/mp4-to-webm")
def mp4_to_webm(file: UploadFile = File(...)):
    return handle_conversion(file, "webm")

@router.post("/mkv-to-mp4")
def mkv_to_mp4(file: UploadFile = File(...)):
    return handle_conversion(file, "mp4")

@router.post("/mp4-to-mov")
def mp4_to_mov(file: UploadFile = File(...)):
    return handle_conversion(file, "mov")

@router.post("/mov-to-avi")
def mov_to_avi(file: UploadFile = File(...)):
    return handle_conversion(file, "avi")

@router.post("/mkv-to-avi")
def mkv_to_avi(file: UploadFile = File(...)):
    return handle_conversion(file, "avi")

@router.post("/webm-to-mov")
def webm_to_mov(file: UploadFile = File(...)):
    return handle_conversion(file, "mov")

@router.post("/avi-to-mov")
def avi_to_mov(file: UploadFile = File(...)):
    return handle_conversion(file, "mov")

@router.post("/mkv-to-mov")
def mkv_to_mov(file: UploadFile = File(...)):
    return handle_conversion(file, "mov")

@router.post("/avi-to-mkv")
def avi_to_mkv(file: UploadFile = File(...)):
    return handle_conversion(file, "mkv")


@router.post("/compress")
def compress_video(
    file: UploadFile = File(...),
    crf: int = Form(28, description="Quality preset (CRF). Lower is better quality but larger size (0-51).")
):
    return handle_manipulation("compress", file, {"crf": crf}, content_type="video/mp4")


@router.post("/trim")
def trim_video(
    file: UploadFile = File(...),
    start_time: str = Form(..., description="Start time (e.g., '00:00:10' or '10')"),
    end_time: str = Form(..., description="End time (e.g., '00:00:20' or '20')")
):
    try:
        if parse_time_to_seconds(end_time) <= parse_time_to_seconds(start_time):
            raise HTTPException(status_code=400, detail="end_time must be strictly greater than start_time.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower() if ext else ".mp4"
    kwargs = {"start_time": start_time, "end_time": end_time, "ext": ext}
    return handle_manipulation("trim", file, kwargs, content_type=get_media_type(ext))


@router.post("/cut-edges")
def cut_edges_video(
    file: UploadFile = File(...),
    front_cut: float = Form(..., description="Seconds to remove from the beginning (e.g. 10)"),
    back_cut: float = Form(..., description="Seconds to remove from the end (e.g. 20)")
):
    if front_cut < 0 or back_cut < 0:
        raise HTTPException(status_code=400, detail="Cut times cannot be negative.")

    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower() if ext else ".mp4"
    kwargs = {"front_cut": front_cut, "back_cut": back_cut, "ext": ext}
    return handle_manipulation("cut-edges", file, kwargs, content_type=get_media_type(ext))


@router.post("/resize")
def resize_video(
    file: UploadFile = File(...),
    width: int = Form(..., description="Target width (e.g., 1280)"),
    height: int = Form(..., description="Target height (e.g., 720)")
):
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower() if ext else ".mp4"
    kwargs = {"width": width, "height": height, "ext": ext}
    return handle_manipulation("resize", file, kwargs, content_type=get_media_type(ext))


@router.post("/add-subtitles")
def add_subtitles(
    file: UploadFile = File(...),
    subtitle: UploadFile = File(...)
):
    return handle_manipulation(
        "add-subtitles", file, {}, content_type="video/x-matroska", extra_files=[subtitle]
    )


@router.post("/mute")
def mute_video(file: UploadFile = File(...)):
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower() if ext else ".mp4"
    return handle_manipulation("mute", file, {"ext": ext}, content_type=get_media_type(ext))


@router.post("/compress-mov")
def compress_mov_endpoint(file: UploadFile = File(...)):
    return handle_manipulation("compress-mov", file, {}, content_type="video/quicktime")


@router.post("/compress-avi")
def compress_avi_endpoint(file: UploadFile = File(...)):
    return handle_manipulation("compress-avi", file, {}, content_type="video/x-msvideo")


@router.post("/compress-mkv")
def compress_mkv_endpoint(file: UploadFile = File(...)):
    return handle_manipulation("compress-mkv", file, {}, content_type="video/x-matroska")
