import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, Form, HTTPException
from fastapi.responses import JSONResponse

from services.tasks import convert_audio_task
from routers._task_polling import poll_task_result

router = APIRouter(prefix="/api/audio", tags=["Audio Conversions & Extraction"])

UPLOAD_DIR = "/tmp/tool-nest-uploads"


def save_upload(upload_file: UploadFile) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    _, ext = os.path.splitext(upload_file.filename or "")
    fd, path = tempfile.mkstemp(suffix=ext or ".tmp", dir=UPLOAD_DIR)
    with os.fdopen(fd, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return path


def _dispatch(file: UploadFile, out_ext: str, media_type: str, to_video: bool = False) -> JSONResponse:
    in_path = save_upload(file)
    try:
        task = convert_audio_task.delay(
            input_path=in_path, output_ext=out_ext, content_type=media_type, to_video=to_video
        )
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Audio conversion has been started."},
        )
    except Exception as e:
        if os.path.exists(in_path):
            os.remove(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start conversion task: {e}")


@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/extract-audio")
async def extract_audio(
    file: UploadFile = File(...),
    format: str = Form("mp3", description="Target audio format (e.g., mp3, wav, ogg, flac)")
):
    format = format.lower().strip('.')
    media_types = {"mp3": "audio/mpeg", "wav": "audio/wav", "ogg": "audio/ogg", "flac": "audio/flac"}
    media_type = media_types.get(format, f"audio/{format}")
    return _dispatch(file, format, media_type)


@router.post("/mp4-to-mp3")
async def mp4_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/mov-to-mp3")
async def mov_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/mkv-to-mp3")
async def mkv_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/webm-to-mp3")
async def webm_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/avi-to-mp3")
async def avi_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/mp4-to-wav")
async def mp4_to_wav(file: UploadFile = File(...)):
    return _dispatch(file, "wav", "audio/wav")

@router.post("/mov-to-wav")
async def mov_to_wav(file: UploadFile = File(...)):
    return _dispatch(file, "wav", "audio/wav")


@router.post("/m4a-to-mp3")
async def m4a_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/ogg-to-mp3")
async def ogg_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/aac-to-mp3")
async def aac_to_mp3(file: UploadFile = File(...)):
    return _dispatch(file, "mp3", "audio/mpeg")

@router.post("/m4a-to-wav")
async def m4a_to_wav(file: UploadFile = File(...)):
    return _dispatch(file, "wav", "audio/wav")

@router.post("/ogg-to-wav")
async def ogg_to_wav(file: UploadFile = File(...)):
    return _dispatch(file, "wav", "audio/wav")

@router.post("/aac-to-wav")
async def aac_to_wav(file: UploadFile = File(...)):
    return _dispatch(file, "wav", "audio/wav")

@router.post("/aac-to-flac")
async def aac_to_flac(file: UploadFile = File(...)):
    return _dispatch(file, "flac", "audio/flac")

@router.post("/aac-to-m4r")
async def aac_to_m4r(file: UploadFile = File(...)):
    return _dispatch(file, "m4r", "audio/x-m4r")


@router.post("/m4a-to-mp4")
async def m4a_to_mp4(file: UploadFile = File(...)):
    return _dispatch(file, "mp4", "video/mp4", to_video=True)

@router.post("/mp4-to-ogg")
async def mp4_to_ogg(file: UploadFile = File(...)):
    return _dispatch(file, "ogg", "audio/ogg")

@router.post("/aac-to-mp4")
async def aac_to_mp4(file: UploadFile = File(...)):
    return _dispatch(file, "mp4", "video/mp4", to_video=True)
