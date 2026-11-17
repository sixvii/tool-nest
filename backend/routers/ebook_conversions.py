import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, HTTPException
from fastapi.responses import JSONResponse

from services.tasks import convert_ebook_task
from routers._task_polling import poll_task_result

router = APIRouter(prefix="/api/convert/ebook", tags=["Ebook Conversions"])

UPLOAD_DIR = "/tmp/tool-nest-uploads"


def _dispatch(file: UploadFile, output_ext: str) -> JSONResponse:
    filename = file.filename or f"document.{output_ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}-{os.path.basename(filename)}")

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        task = convert_ebook_task.delay(
            input_path=input_path, original_filename=filename, output_ext=output_ext
        )
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Ebook conversion has been started."},
        )
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"Failed to start conversion task: {e}")


@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/epub-to-pdf")
async def epub_to_pdf(file: UploadFile = File(...)):
    return _dispatch(file, "pdf")


@router.post("/pdf-to-epub")
async def pdf_to_epub(file: UploadFile = File(...)):
    return _dispatch(file, "epub")


@router.post("/mobi-to-pdf")
async def mobi_to_pdf(file: UploadFile = File(...)):
    return _dispatch(file, "pdf")


@router.post("/pdf-to-mobi")
async def pdf_to_mobi(file: UploadFile = File(...)):
    return _dispatch(file, "mobi")


@router.post("/azw3-to-pdf")
async def azw3_to_pdf(file: UploadFile = File(...)):
    return _dispatch(file, "pdf")


@router.post("/pdf-to-azw3")
async def pdf_to_azw3(file: UploadFile = File(...)):
    return _dispatch(file, "azw3")
