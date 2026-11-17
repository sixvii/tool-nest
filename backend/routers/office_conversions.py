import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, HTTPException
from fastapi.responses import JSONResponse

from services.tasks import convert_office_document
from services.upload_validation import assert_office, assert_pdf, InvalidFileTypeError
from routers._task_polling import poll_task_result

router = APIRouter(prefix="/api/convert/office", tags=["Office Document Conversions"])

# Expected input type per operation, so a mislabelled/hostile upload is rejected
# before LibreOffice (or msgconvert) parses it. eml-to-pdf is a plain-text RFC822
# message with no magic, so it is deliberately not validated here.
_INPUT_VALIDATORS = {
    "word-to-pdf": assert_office,
    "ppt-to-pdf": assert_office,
    "msg-to-pdf": assert_office,   # .msg is an OLE compound file
    "pdf-to-word": assert_pdf,
    "pdf-to-ppt": assert_pdf,
}


def _dispatch(operation: str, file: UploadFile) -> JSONResponse:
    filename = file.filename or "document"

    validator = _INPUT_VALIDATORS.get(operation)
    if validator:
        try:
            validator(file.file)
        except InvalidFileTypeError as e:
            raise HTTPException(status_code=400, detail=str(e))

    upload_dir = "/tmp/tool-nest-uploads"
    os.makedirs(upload_dir, exist_ok=True)

    input_path = os.path.join(upload_dir, f"{uuid.uuid4()}-{os.path.basename(filename)}")
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        task = convert_office_document.delay(
            operation=operation, input_path=input_path, original_filename=filename
        )
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "File conversion has been started."},
        )
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"Failed to start conversion task: {e}")


@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/word-to-pdf")
def word_to_pdf(file: UploadFile = File(...)):
    return _dispatch("word-to-pdf", file)


@router.post("/pdf-to-word")
def pdf_to_word(file: UploadFile = File(...)):
    return _dispatch("pdf-to-word", file)


@router.post("/ppt-to-pdf")
def ppt_to_pdf(file: UploadFile = File(...)):
    return _dispatch("ppt-to-pdf", file)


@router.post("/pdf-to-ppt")
def pdf_to_ppt(file: UploadFile = File(...)):
    return _dispatch("pdf-to-ppt", file)


@router.post("/msg-to-pdf")
def msg_to_pdf(file: UploadFile = File(...)):
    return _dispatch("msg-to-pdf", file)


@router.post("/eml-to-pdf")
def eml_to_pdf(file: UploadFile = File(...)):
    return _dispatch("eml-to-pdf", file)
