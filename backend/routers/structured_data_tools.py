import os
import gc
import json
import csv
import tempfile
import shutil
from io import BytesIO, StringIO
import xmltodict
import pandas as pd
import ijson
from dicttoxml import dicttoxml
from xml.dom.minidom import parseString

from fastapi import APIRouter, UploadFile, BackgroundTasks, File, HTTPException
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from services.tasks import ocr_task
from routers._task_polling import poll_task_result


router = APIRouter(prefix="/api/convert/data", tags=["Structured Data Conversions"])

def cleanup_files(*paths):
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except Exception:
                pass

@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/json-to-xml")
def json_to_xml(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(in_fd, "wb") as f:
        shutil.copyfileobj(file.file, f)

    background_tasks.add_task(cleanup_files, in_path)

    try:
        with open(in_path, 'rb') as json_file:
            data = json.load(json_file)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file")
    
    if isinstance(data, list):
        data = {"data": {"item": data}}
    elif isinstance(data, dict) and len(data) != 1:
        data = {"data": data}
        
    try:
        pretty_xml = xmltodict.unparse(data, pretty=True, indent="  ").encode('utf-8')
    except Exception:
        raw_xml_bytes = dicttoxml(data, attr_type=False, custom_root='data')
        dom = parseString(raw_xml_bytes)
        pretty_xml = dom.toprettyxml(indent="  ").encode('utf-8')
    
    return StreamingResponse(
        BytesIO(pretty_xml),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{os.path.splitext(file.filename or "data")[0]}.xml"'}
    )

@router.post("/csv-to-xml")
def csv_to_xml(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".csv")
    with os.fdopen(in_fd, "wb") as f:
        shutil.copyfileobj(file.file, f)

    background_tasks.add_task(cleanup_files, in_path)

    try:
        with open(in_path, 'r', encoding='utf-8-sig', errors='replace') as csv_file:
            csv_reader = csv.DictReader(csv_file)
            data_list = [row for row in csv_reader]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing CSV: {str(e)}")
    
    wrapped_data = {"data": {"row": data_list}}
    
    pretty_xml = xmltodict.unparse(wrapped_data, pretty=True, indent="  ").encode('utf-8')
    
    return StreamingResponse(
        BytesIO(pretty_xml),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{os.path.splitext(file.filename or "data")[0]}.xml"'}
    )


@router.post("/xml-to-json")
def xml_to_json(file: UploadFile = File(...)):
    try:
        data = xmltodict.parse(file.file)
    except Exception as e:
        raise HTTPException(400, f"Invalid XML file: {str(e)}")
        
    json_content = json.dumps(data, indent=4).encode('utf-8')
    
    return StreamingResponse(
        BytesIO(json_content),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{os.path.splitext(file.filename or "data")[0]}.json"'}
    )

@router.post("/csv-to-json")
def csv_to_json(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".csv")
    with os.fdopen(in_fd, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    out_fd, out_path = tempfile.mkstemp(suffix=".json")
    os.close(out_fd)

    try:
        with open(in_path, 'r', encoding='utf-8-sig', errors='replace') as csv_file:
            csv_reader = csv.DictReader(csv_file)
            
            with open(out_path, 'w', encoding='utf-8') as json_file:
                json_file.write('[\n')
                first = True
                for row in csv_reader:
                    if not first:
                        json_file.write(',\n')
                    json.dump(row, json_file, indent=2)
                    first = False
                json_file.write('\n]')
                
        background_tasks.add_task(cleanup_files, in_path, out_path)
        
        return FileResponse(
            out_path,
            media_type="application/json",
            filename=f"{os.path.splitext(file.filename or 'data')[0]}.json"
        )
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=f"Error converting CSV to JSON: {str(e)}")
    finally:
        gc.collect()
        

@router.post("/json-to-csv")
def json_to_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".json")
    with os.fdopen(in_fd, "wb") as f:
        shutil.copyfileobj(file.file, f)
        
    out_fd, out_path = tempfile.mkstemp(suffix=".csv")
    os.close(out_fd)

    try:
        with open(in_path, 'rb') as json_file:
            objects = ijson.items(json_file, 'item')
            
            first_obj = next(objects, None)
            
            if not first_obj:
                raise ValueError("JSON file is empty or not formatted as an array of objects.")
                
            headers = list(first_obj.keys())
            
            with open(out_path, 'w', newline='', encoding='utf-8') as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=headers, extrasaction='ignore')
                writer.writeheader()
                writer.writerow(first_obj)
                
                for obj in objects:
                    writer.writerow(obj)
                
        background_tasks.add_task(cleanup_files, in_path, out_path)
        
        return FileResponse(
            out_path,
            media_type="text/csv",
            filename=f"{os.path.splitext(file.filename or 'data')[0]}.csv"
        )
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=f"Error converting JSON to CSV: {str(e)}")
    finally:
        gc.collect()


@router.post("/xml-to-excel")
def xml_to_excel(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".xml")
    with os.fdopen(in_fd, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        df = pd.read_xml(in_path)
    except Exception as e:
        cleanup_files(in_path)
        raise HTTPException(status_code=400, detail=f"Error parsing XML: {str(e)}")
        
    out_fd, out_path = tempfile.mkstemp(suffix=".xlsx")
    os.close(out_fd)
    
    try:
        df.to_excel(out_path, index=False)
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=f"Error generating Excel: {str(e)}")
        
    background_tasks.add_task(cleanup_files, in_path, out_path)
    
    return FileResponse(
        out_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{os.path.splitext(file.filename or 'data')[0]}.xlsx"
    )

@router.post("/xml-to-csv")
def xml_to_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".xml")
    with os.fdopen(in_fd, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        df = pd.read_xml(in_path)
    except Exception as e:
        cleanup_files(in_path)
        raise HTTPException(status_code=400, detail=f"Error parsing XML: {str(e)}")
        
    out_fd, out_path = tempfile.mkstemp(suffix=".csv")
    os.close(out_fd)
    
    try:
        df.to_csv(out_path, index=False)
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=f"Error generating CSV: {str(e)}")
        
    background_tasks.add_task(cleanup_files, in_path, out_path)
    
    return FileResponse(
        out_path,
        media_type="text/csv",
        filename=f"{os.path.splitext(file.filename or 'data')[0]}.csv"
    )

@router.post("/excel-to-xml")
def excel_to_xml(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_fd, in_path = tempfile.mkstemp(suffix=".xlsx")
    with os.fdopen(in_fd, "wb") as f:
        file.file.seek(0)
        shutil.copyfileobj(file.file, f)
        
    out_fd, out_path = tempfile.mkstemp(suffix=".xml")
    os.close(out_fd)
    
    try:
        df = pd.read_excel(in_path)
        df.to_xml(out_path, index=False)
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=400, detail=f"Error processing Excel to XML: {str(e)}")
        
    background_tasks.add_task(cleanup_files, in_path, out_path)
    
    return FileResponse(
        out_path,
        media_type="application/xml",
        filename=f"{os.path.splitext(file.filename or 'data')[0]}.xml"
    )

def _stream_text_response(buf: StringIO, filename: str):
    bytes_buf = BytesIO(buf.getvalue().encode('utf-8'))
    bytes_buf.seek(0)
    return StreamingResponse(
        bytes_buf,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}.txt"'}
    )

def _dispatch_ocr(file: UploadFile, mode: str):
    upload_dir = "/tmp/tool-nest-uploads"
    os.makedirs(upload_dir, exist_ok=True)
    filename = file.filename or "image"
    in_path = os.path.join(upload_dir, f"{os.urandom(8).hex()}-{os.path.basename(filename)}")
    with open(in_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        task = ocr_task.delay(input_path=in_path, original_filename=filename, mode=mode)
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "OCR task has been started."},
        )
    except Exception as e:
        cleanup_files(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start OCR task: {e}")


@router.post("/image-to-text")
def image_to_text(file: UploadFile = File(...)):
    return _dispatch_ocr(file, "image")

@router.post("/tiff-to-text")
def tiff_to_text(file: UploadFile = File(...)):
    return _dispatch_ocr(file, "tiff")
