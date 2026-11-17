import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, BackgroundTasks, File, Form, HTTPException
from fastapi.responses import FileResponse

from services import file_service

router = APIRouter(prefix="/api/file", tags=["CSV and Excel Conversions"])

def cleanup_temp_dir(dir_path: str):
    if dir_path and os.path.exists(dir_path):
        shutil.rmtree(dir_path)

@router.post("/csv-to-excel")
def csv_to_excel(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    temp_dir = tempfile.mkdtemp()
    filename = file.filename or "data.csv"
    try:
        output_path = file_service.convert_csv_to_excel(file.file, filename, temp_dir)
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=os.path.basename(output_path))
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/excel-to-csv")
def excel_to_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    temp_dir = tempfile.mkdtemp()
    filename = file.filename or "data.xlsx"
    try:
        output_path = file_service.convert_excel_to_csv(file.file, filename, temp_dir)
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        is_zip = output_path.endswith(".zip")
        media_type = "application/zip" if is_zip else "text/csv"
        
        return FileResponse(output_path, media_type=media_type, filename=os.path.basename(output_path))
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/split-csv")
def split_csv(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    rows_per_file: int = Form(..., description="Number of rows per output file (excluding header)")
):
    if rows_per_file <= 0:
        raise HTTPException(status_code=400, detail="rows_per_file must be greater than 0")
        
    temp_dir = tempfile.mkdtemp()
    filename = file.filename or "data.csv"
    try:
        output_path = file_service.split_csv(file.file, filename, rows_per_file, temp_dir)
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        return FileResponse(output_path, media_type="application/zip", filename=os.path.basename(output_path))
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/split-excel")
def split_excel(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    rows_per_file: int = Form(..., description="Number of rows per output sheet file (excluding header)")
):
    if rows_per_file <= 0:
        raise HTTPException(status_code=400, detail="rows_per_file must be greater than 0")
        
    temp_dir = tempfile.mkdtemp()
    filename = file.filename or "data.xlsx"
    try:
        output_path = file_service.split_excel(file.file, filename, rows_per_file, temp_dir)
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        return FileResponse(output_path, media_type="application/zip", filename=os.path.basename(output_path))
    except Exception as e:
        cleanup_temp_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))