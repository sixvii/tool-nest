import os
import gc
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, HTTPException
from fastapi.responses import FileResponse

from services import pdf_data_service

router = APIRouter(prefix="/api/convert/pdf-data", tags=["PDF Text & Tabular Data Extraction"])

def cleanup_file(path: str):
    if path and os.path.exists(path):
        os.remove(path)
    gc.collect()

@router.post("/pdf-to-text")
async def pdf_to_text(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        output_path = pdf_data_service.extract_text_from_pdf(file.file)
        background_tasks.add_task(cleanup_file, output_path)
        gc.collect()
        return FileResponse(
            output_path,
            media_type="text/plain",
            filename=f"{os.path.splitext(file.filename or 'document')[0]}.txt"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pdf-to-csv")
async def pdf_to_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        output_path = pdf_data_service.extract_csv_from_pdf(file.file)
        background_tasks.add_task(cleanup_file, output_path)
        
        is_zip = output_path.endswith(".zip")
        media_type = "application/zip" if is_zip else "text/csv"
        ext = ".zip" if is_zip else ".csv"
        
        gc.collect()
        return FileResponse(
            output_path,
            media_type=media_type,
            filename=f"{os.path.splitext(file.filename or 'document')[0]}{ext}"
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pdf-to-excel")
async def pdf_to_excel(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        output_path = pdf_data_service.extract_excel_from_pdf(file.file)
        background_tasks.add_task(cleanup_file, output_path)
        
        gc.collect()
        return FileResponse(
            output_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"{os.path.splitext(file.filename or 'document')[0]}.xlsx"
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))