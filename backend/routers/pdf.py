import os
import shutil
import uuid
from typing import Optional, List, Annotated
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, Form, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse

from services import pdf_service
from services.tasks import compress_pdf_task
from services.upload_validation import assert_pdf, InvalidFileTypeError
from routers._task_polling import poll_task_result

router = APIRouter(prefix="/api/pdf", tags=["PDF Manipulation & Editing"])

UPLOAD_DIR = "/tmp/tool-nest-uploads"

def cleanup_file(path: str):
    if path and os.path.exists(path):
        os.remove(path)

@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)

@router.post("/merge")
def merge_pdfs(
    background_tasks: BackgroundTasks,
    files: Annotated[List[UploadFile], File(description="Multiple PDF files to merge")]
):
    output_path = pdf_service.merge_pdfs([f.file for f in files])
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename="merged.pdf")

@router.post("/split")
def split_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    page_ranges: str = Form(..., description="Page ranges to extract, e.g., '0-2, 4, 6-8' (0-indexed)")
):
    try:
        output_path = pdf_service.split_pdf(file.file, page_ranges)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"split_{file.filename or 'document.pdf'}")

@router.post("/rotate")
def rotate_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    degrees: int = Form(..., description="Degrees to rotate (e.g., 90, 180, 270)"),
    page_ranges: Optional[str] = Form(None, description="Page ranges to rotate, e.g., '0-2, 4'. If empty, rotates all pages.")
):
    try:
        output_path = pdf_service.rotate_pdf(file.file, degrees, page_ranges)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"rotated_{file.filename or 'document.pdf'}")

@router.post("/rearrange")
def rearrange_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    page_indices: str = Form(..., description="Comma-separated list of page indices, e.g., '2,0,1'")
):
    try:
        indices = [int(x.strip()) for x in page_indices.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid page_indices format. Must be comma-separated integers.")
    
    output_path = pdf_service.rearrange_pdf(file.file, indices)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"rearranged_{file.filename or 'document.pdf'}")

@router.post("/delete-pages")
def delete_pages_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages: str = Form(..., description="Comma-separated list of page indices to delete, e.g., '0,2'")
):
    try:
        pages_to_drop = [int(x.strip()) for x in pages.split(",")]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pages format. Must be comma-separated integers.")
    
    output_path = pdf_service.delete_pages_pdf(file.file, pages_to_drop)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"deleted_{file.filename or 'document.pdf'}")

@router.post("/crop")
def crop_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    x_percent: float = Form(..., description="Starting X coordinate as a percentage from the left (0-100)"),
    y_percent: float = Form(..., description="Starting Y coordinate as a percentage from the top (0-100)"),
    width_percent: float = Form(..., description="Width of the cropped area as a percentage (0-100)"),
    height_percent: float = Form(..., description="Height of the cropped area as a percentage (0-100)")
):
    if not (0 <= x_percent <= 100 and 0 <= y_percent <= 100 and 0 < width_percent <= 100 and 0 < height_percent <= 100):
        raise HTTPException(status_code=400, detail="Percentages must be between 0 and 100.")
        
    output_path = pdf_service.crop_pdf(file.file, x_percent, y_percent, width_percent, height_percent)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"cropped_{file.filename or 'document.pdf'}")

@router.post("/resize")
def resize_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    width: float = Form(..., description="New width in points (1/72 inch). Example: 595 for A4 width"),
    height: float = Form(..., description="New height in points (1/72 inch). Example: 842 for A4 height")
):
    output_path = pdf_service.resize_pdf(file.file, width, height)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"resized_{file.filename or 'document.pdf'}")

@router.post("/compress")
def compress_pdf(
    file: UploadFile = File(...),
    compression_level: int = Form(4, description="0: Default, 1: Prepress, 2: Printer, 3: Ebook, 4: Screen (Lowest Quality/Highest Compression)")
):
    filename = file.filename or "document.pdf"
    # Reject non-PDF uploads before they reach Ghostscript (malicious-document
    # RCE surface). Cheap magic-byte check on the boundary; rewinds the stream.
    try:
        assert_pdf(file.file)
    except InvalidFileTypeError as e:
        raise HTTPException(status_code=400, detail=str(e))

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    input_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}-{os.path.basename(filename)}")
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        task = compress_pdf_task.delay(
            input_path=input_path, original_filename=filename, compression_level=compression_level
        )
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "PDF compression has been started."},
        )
    except Exception as e:
        if os.path.exists(input_path):
            os.remove(input_path)
        raise HTTPException(status_code=500, detail=f"Failed to start compression task: {e}")

@router.post("/protect")
def protect_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    output_path = pdf_service.protect_pdf(file.file, password)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"protected_{file.filename or 'document.pdf'}")

@router.post("/unlock")
def unlock_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    output_path = pdf_service.unlock_pdf(file.file, password)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"unlocked_{file.filename or 'document.pdf'}")

@router.post("/watermark")
def watermark_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    text: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    x: float = Form(0.0),
    y: float = Form(0.0),
    font_size: float = Form(36.0),
    color_hex: str = Form("#808080"),
    opacity: float = Form(0.5),
    rotation: float = Form(0.0),
    page_from: int = Form(0),
    page_to: Optional[int] = Form(None),
    position: Optional[str] = Form(None),
    layer: str = Form("over"),
    mosaic: bool = Form(False)
):
    output_path = pdf_service.watermark_pdf(
        file_stream=file.file,
        text=text,
        image_stream=image.file if image else None,
        x=x,
        y=y,
        font_size=font_size,
        color_hex=color_hex,
        opacity=opacity,
        rotation=rotation,
        page_from=page_from,
        page_to=page_to,
        position=position,
        layer=layer,
        mosaic=mosaic
    )
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"watermarked_{file.filename or 'document.pdf'}")

@router.post("/extract-images")
def extract_images_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    output_path = pdf_service.extract_images_pdf(file.file)
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/zip", filename="extracted_images.zip")

@router.post("/parse")
def parse_pdf(file: UploadFile = File(...)):
    parsed_data = pdf_service.parse_pdf(file.file)
    return parsed_data

@router.post("/edit")
async def edit_pdf(
    background_tasks: BackgroundTasks,
    request: Request
):
    form_data = await request.form()
    
    file = form_data.get("file")
    elements = form_data.get("elements")

    if not file or not elements:
        raise HTTPException(status_code=400, detail="Missing required 'file' or 'elements' parameter")

    assets = {}
    for key, value in form_data.items():
        if key.startswith("image_") or key.startswith("drawing_") or key.startswith("draw_"):
            assets[key] = await value.read()

    output_path = pdf_service.edit_pdf(file.file, elements, assets)
    
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"edited_{file.filename or 'document.pdf'}")


@router.post("/replace-text")
def replace_text_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    search_text: str = Form(..., description="The existing text in the PDF you want to replace"),
    replace_text: str = Form(..., description="The new text you want to insert"),
    mode: str = Form("all", description='"all" to replace every instance, "single" to replace one specific instance'),
    match_index: int = Form(0, description="0-based index of which occurrence to replace (only used when mode='single')")
):
    output_path = pdf_service.replace_text_pdf(
        file.file, 
        search_text, 
        replace_text,
        mode=mode,
        match_index=match_index
    )
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"replaced_{file.filename or 'document.pdf'}")

@router.post("/esign")
def esign_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    signature_type: str = Form("certificate", description='"certificate", "text", "image", or "draw"'),
    signature_text: Optional[str] = Form(None, description="The text to render as a signature"),
    signature_image: Optional[UploadFile] = File(None, description="Image file of drawn/uploaded signature"),
    signature_font: Optional[str] = Form(None, description='Font style for text signatures (e.g. "cursive", "serif")'),
    font_size: int = Form(24, description="Size of the text signature"),
    page: int = Form(1, description="Which page to place the signature on (1-indexed)"),
    certificate: Optional[UploadFile] = File(None),
    password: Optional[str] = Form(None),
    x: float = Form(0.0, description="X coordinate as a percentage of page width (0.0 to 1.0)"),
    y: float = Form(0.0, description="Y coordinate as a percentage of page height (0.0 to 1.0)")
):
    output_path = pdf_service.esign_pdf(
        file.file,
        signature_type=signature_type,
        cert_stream=certificate.file if certificate else None,
        password=password,
        signature_text=signature_text,
        signature_image_stream=signature_image.file if signature_image else None,
        signature_font=signature_font,
        font_size=font_size,
        x=x,
        y=y,
        page_num=page
    )
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename=f"esigned_{file.filename or 'document.pdf'}")