import os
import shutil
import uuid
from typing import List, Annotated
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from services import image_pdf_service
from services.tasks import convert_pdf_to_images_task
from routers._task_polling import poll_task_result


router = APIRouter(prefix="/api/convert/image-pdf", tags=["Image and PDF Cross-Conversions"])

UPLOAD_DIR = "/tmp/tool-nest-uploads"


def cleanup_file(path: str):
    if os.path.exists(path):
        os.remove(path)


def _dispatch_pdf_to_images(file: UploadFile, output_format: str) -> JSONResponse:
    filename = file.filename or "document.pdf"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}-{os.path.basename(filename)}")
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        task = convert_pdf_to_images_task.delay(
            input_path=input_path, original_filename=filename, output_format=output_format
        )
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": f"PDF to {output_format} conversion has been started."},
        )
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"Failed to start conversion task: {e}")


@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/images-to-pdf")
def convert_images_to_pdf(background_tasks: BackgroundTasks, files: Annotated[List[UploadFile], File(description="Multiple image files")]):
    output_path = image_pdf_service.convert_images_to_pdf([f.file for f in files])
    background_tasks.add_task(cleanup_file, output_path)
    
    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"{os.path.splitext(files[0].filename if files and files[0].filename else 'image')[0]}.pdf"
    )

@router.post("/pdf-to-jpg")
def convert_pdf_to_jpg(file: UploadFile):
    return _dispatch_pdf_to_images(file, "jpg")

@router.post("/pdf-to-png")
def convert_pdf_to_png(file: UploadFile):
    return _dispatch_pdf_to_images(file, "png")

@router.post("/pdf-to-tiff")
def convert_pdf_to_tiff(file: UploadFile):
    return _dispatch_pdf_to_images(file, "tiff")


@router.post("/heic-to-pdf")
def convert_heic_to_pdf(background_tasks: BackgroundTasks, files: Annotated[List[UploadFile], File(description="Multiple HEIC files")]):
    output_path = image_pdf_service.convert_heic_to_pdf([f.file for f in files])
    background_tasks.add_task(cleanup_file, output_path)
    
    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"{os.path.splitext(files[0].filename if files and files[0].filename else 'image')[0]}.pdf"
    )

@router.post("/eps-to-pdf")
def convert_eps_to_pdf(background_tasks: BackgroundTasks, files: Annotated[List[UploadFile], File(description="Multiple EPS files")]):
    output_path = image_pdf_service.convert_eps_to_pdf([f.file for f in files])
    background_tasks.add_task(cleanup_file, output_path)
    
    return FileResponse(
        output_path,
        media_type="application/pdf",
        filename=f"{os.path.splitext(files[0].filename if files and files[0].filename else 'image')[0]}.pdf"
    )