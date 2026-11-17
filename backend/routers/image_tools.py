import os
import gc
import io
import shutil
import tempfile
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse

from services import image_tools_service
from services.tasks import remove_background_task, add_text_to_image_task
from services.upload_validation import assert_eps, InvalidFileTypeError
from routers._task_polling import poll_task_result


image_router = APIRouter(
    prefix="/api/image", 
    tags=["Image Tools"]
)

convert_router = APIRouter(
    prefix="/api/convert/image", 
    tags=["Image Format Conversion"]
)

def _stream(buf: io.BytesIO, media_type: str, filename: str, background_tasks: BackgroundTasks) -> StreamingResponse:
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

def cleanup_file(path: str):
    if os.path.exists(path):
        os.remove(path)

def cleanup_files(in_path: str, out_path: str = None):
    if in_path and os.path.exists(in_path):
        os.remove(in_path)
    if out_path and os.path.exists(out_path):
        os.remove(out_path)
    gc.collect()

def cleanup_dir(dir_path: str):
    if dir_path and os.path.exists(dir_path):
        shutil.rmtree(dir_path)
    gc.collect()

def save_upload(upload_file: UploadFile) -> str:
    _, ext = os.path.splitext(upload_file.filename or "")
    fd, path = tempfile.mkstemp(suffix=ext or ".tmp")
    with os.fdopen(fd, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return path


def _guard_eps(file: UploadFile):
    """Reject non-EPS uploads with 400 before they reach ImageMagick/Ghostscript.
    Must be called OUTSIDE the endpoints' broad `except Exception` block, which
    would otherwise swallow the HTTPException into a 500."""
    try:
        assert_eps(file.file)
    except InvalidFileTypeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@image_router.get("/task/{task_id}")
def get_image_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@image_router.post("/resize")
def resize_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    width: int = Form(...),
    height: int = Form(...),
):
    import gc
    try:
        buf, fmt = image_tools_service.resize_image(file.file, width, height)
        return _stream(buf, f"image/{fmt}", f"resized.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/black-and-white")
def black_and_white(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    import gc
    try:
        buf, fmt = image_tools_service.black_and_white(file.file)
        return _stream(buf, f"image/{fmt}", f"bw.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()


@image_router.post("/add-border")
def add_border(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    border_width: int = Form(10),
    color_hex: str = Form("black"),
    style: str = Form("solid")
):
    import gc
    try:
        buf, fmt = image_tools_service.add_border(file.file, border_width, color_hex, style)
        return _stream(buf, f"image/{fmt}", f"bordered.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/pixelate")
def pixelate(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pixel_size: int = Form(10)
):
    import gc
    try:
        buf, fmt = image_tools_service.pixelate(file.file, pixel_size)
        return _stream(buf, f"image/{fmt}", f"pixelated.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/flip")
def flip_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    direction: str = Form("horizontal")
):
    import gc
    try:
        buf, fmt = image_tools_service.flip_image(file.file, direction)
        return _stream(buf, f"image/{fmt}", f"flipped.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()


@image_router.post("/view-metadata")
def view_metadata(file: UploadFile = File(...)):
    import gc
    try:
        metadata = image_tools_service.view_metadata(file.file, file.filename)
        return JSONResponse(content={"success": True, "metadata": metadata})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()


@image_router.post("/remove-metadata")
def remove_metadata(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import os
    import gc
    from fastapi.responses import FileResponse

    try:
        out_path, ext = image_tools_service.remove_metadata(file.file, file.filename)

        background_tasks.add_task(cleanup_file, out_path)

        base_name = os.path.splitext(file.filename or "image")[0]
        return FileResponse(
            out_path,
            media_type=f"image/{ext.lower().strip('.')}",
            filename=f"{base_name}_cleaned{ext}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()


# ---------------------------------------------------------------------------
# Background removal / blur / add-text — Celery-backed (see services/tasks.py
# remove_background_task / add_text_to_image_task). These were previously
# fully synchronous; converted here to the standard dispatch -> 202 ->
# poll -> file pattern used by every other module (see backend context doc's
# "How to convert a new module to this pattern" recipe).
# ---------------------------------------------------------------------------

@image_router.post("/blur-background")
def blur_background(
    file: UploadFile = File(...),
    radius: int = Form(15)
):
    in_path = save_upload(file)
    try:
        task = remove_background_task.delay(in_path, file.filename, "blur", radius)
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Background blur has been started."},
        )
    except Exception as e:
        cleanup_file(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start blur task: {e}")


@image_router.post("/remove-background")
def remove_background(
    file: UploadFile = File(...),
    alpha_matting: bool = Form(False, description="Refine cutout edges (hair/fur). Slower/heavier; off by default."),
):
    in_path = save_upload(file)
    try:
        task = remove_background_task.delay(in_path, file.filename, "remove", alpha_matting=alpha_matting)
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Background removal has been started."},
        )
    except Exception as e:
        cleanup_file(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start background removal task: {e}")


@image_router.post("/transparent-background")
def transparent_background(
    file: UploadFile = File(...),
    alpha_matting: bool = Form(False, description="Refine cutout edges (hair/fur). Slower/heavier; off by default."),
):
    in_path = save_upload(file)
    try:
        task = remove_background_task.delay(in_path, file.filename, "transparent", alpha_matting=alpha_matting)
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Background removal has been started."},
        )
    except Exception as e:
        cleanup_file(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start background removal task: {e}")


@image_router.post("/add-text")
def add_text_to_image(
    file: UploadFile = File(...),
    text: str = Form(...),
    x: int = Form(...),
    y: int = Form(...),
    font_size: int = Form(24),
    color: str = Form("black"),
    font_family: str = Form("Arial"),
    rotation: float = Form(0.0),
):
    in_path = save_upload(file)
    try:
        task = add_text_to_image_task.delay(in_path, file.filename, text, x, y, font_size, color, font_family, rotation)
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "Adding text has been started."},
        )
    except Exception as e:
        cleanup_file(in_path)
        raise HTTPException(status_code=500, detail=f"Failed to start add-text task: {e}")


@image_router.post("/profile-photo-maker")
def profile_photo_maker(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    bg_color: Optional[str] = Form(None)
):
    try:
        buf, fmt = image_tools_service.profile_photo_maker(file.file, bg_color)
        return _stream(buf, f"image/{fmt}", f"profile.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/split-image")
def split_image(
    background_tasks: BackgroundTasks, file: UploadFile = File(...), grid_rows: int = Form(2), grid_cols: int = Form(2)
):
    temp_dir = tempfile.mkdtemp(dir="/tmp")
    try:
        out_path = image_tools_service.split_image(file.file, grid_rows, grid_cols, temp_dir)
        background_tasks.add_task(cleanup_dir, temp_dir)
        return FileResponse(out_path, media_type="application/zip", filename="split_images.zip")
    except Exception as e:
        cleanup_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()
    
@image_router.post("/compress")
def compress_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    quality: int = Form(..., ge=1, le=100),
):
    try:
        buf = image_tools_service.compress_image(file.file, quality)
        return _stream(buf, "image/jpeg", "compressed.jpg", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/crop")
def crop_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    x: int = Form(...),
    y: int = Form(...),
    width: int = Form(...),
    height: int = Form(...),
):
    try:
        buf, fmt = image_tools_service.crop_image(file.file, x, y, width, height)
        return _stream(buf, f"image/{fmt}", f"cropped.{fmt}", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/round")
def round_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    try:
        buf = image_tools_service.round_image(file.file)
        return _stream(buf, "image/png", "rounded.png", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()


@convert_router.post("/webp-to-jpg")
def convert_webp_to_jpg(file: UploadFile, background_tasks: BackgroundTasks):
    output_path = image_tools_service.convert_image_format(file.file, "jpg")
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(
        output_path,
        media_type="image/jpeg",
        filename=f"{os.path.splitext(file.filename or 'image')[0]}.jpg"
    )

@convert_router.post("/png-to-jpg")
def convert_png_to_jpg(file: UploadFile, background_tasks: BackgroundTasks):
    output_path = image_tools_service.convert_image_format(file.file, "jpg")
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(
        output_path,
        media_type="image/jpeg",
        filename=f"{os.path.splitext(file.filename or 'image')[0]}.jpg"
    )

@convert_router.post("/webp-to-png")
def convert_webp_to_png(file: UploadFile, background_tasks: BackgroundTasks):
    output_path = image_tools_service.convert_image_format(file.file, "png")
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(
        output_path,
        media_type="image/png",
        filename=f"{os.path.splitext(file.filename or 'image')[0]}.png"
    )

@convert_router.post("/jpg-to-png")
def convert_jpg_to_png(file: UploadFile, background_tasks: BackgroundTasks):
    output_path = image_tools_service.convert_image_format(file.file, "png")
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(
        output_path,
        media_type="image/png",
        filename=f"{os.path.splitext(file.filename or 'image')[0]}.png"
    )

@convert_router.post("/jpg-to-webp")
def convert_jpg_to_webp(file: UploadFile, background_tasks: BackgroundTasks):
    output_path = image_tools_service.convert_image_format(file.file, "webp")
    background_tasks.add_task(cleanup_file, output_path)
    return FileResponse(
        output_path,
        media_type="image/webp",
        filename=f"{os.path.splitext(file.filename or 'image')[0]}.webp"
    )


@convert_router.post("/tiff-to-jpg")
def convert_tiff_to_jpg(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        output_path, is_zip = image_tools_service.convert_tiff(file.file, "jpg")
        background_tasks.add_task(cleanup_file, output_path)
        base_name = os.path.splitext(file.filename or "image")[0]
        return FileResponse(
            output_path,
            media_type="application/zip" if is_zip else "image/jpeg",
            filename=f"{base_name}{'.zip' if is_zip else '.jpg'}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@convert_router.post("/tiff-to-png")
def convert_tiff_to_png(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        output_path, is_zip = image_tools_service.convert_tiff(file.file, "png")
        background_tasks.add_task(cleanup_file, output_path)
        base_name = os.path.splitext(file.filename or "image")[0]
        return FileResponse(
            output_path,
            media_type="application/zip" if is_zip else "image/png",
            filename=f"{base_name}{'.zip' if is_zip else '.png'}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@convert_router.post("/jpg-to-avif")
def convert_jpg_to_avif(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf = image_tools_service.convert_to_avif(file.file)
        return _stream(buf, "image/avif", "converted.avif", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/png-to-avif")
def convert_png_to_avif(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf = image_tools_service.convert_to_avif(file.file)
        return _stream(buf, "image/avif", "converted.avif", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/webp-to-avif")
def convert_webp_to_avif(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf = image_tools_service.convert_to_avif(file.file)
        return _stream(buf, "image/avif", "converted.avif", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/gif-to-avif")
def convert_gif_to_avif(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf = image_tools_service.convert_to_avif(file.file)
        return _stream(buf, "image/avif", "converted.avif", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/combine-images")
@image_router.post("/collage-maker")
def combine_images(
    background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), layout_type: str = Form("grid")
):
    import gc
    temp_dir = tempfile.mkdtemp(dir="/tmp")
    try:
        out_path = image_tools_service.combine_images([f.file for f in files], layout_type, temp_dir)
        background_tasks.add_task(cleanup_dir, temp_dir)
        return FileResponse(out_path, media_type="image/jpeg", filename="combined.jpg")
    except Exception as e:
        cleanup_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/jpg-to-gif")
@convert_router.post("/png-to-gif")
@convert_router.post("/webp-to-gif")
def images_to_gif_endpoint(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    import gc
    try:
        buf = image_tools_service.images_to_gif([f.file for f in files])
        return _stream(buf, "image/gif", "animated.gif", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/gif-to-jpg")
def gif_to_jpg(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf, is_zip = image_tools_service.extract_gif_frames(file.file, "JPEG")
        if is_zip:
            return _stream(buf, "application/zip", "frames.zip", background_tasks)
        return _stream(buf, "image/jpeg", "frame.jpg", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/gif-to-png")
def gif_to_png(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf, is_zip = image_tools_service.extract_gif_frames(file.file, "PNG")
        if is_zip:
            return _stream(buf, "application/zip", "frames.zip", background_tasks)
        return _stream(buf, "image/png", "frame.png", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/png-to-eps")
def convert_png_to_eps(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    in_path = save_upload(file)
    out_path = None
    try:
        out_path = image_tools_service.convert_image_magick(in_path, "eps")
        background_tasks.add_task(cleanup_files, in_path, out_path)
        base_name = os.path.splitext(file.filename or 'image')[0]
        return FileResponse(out_path, media_type="application/postscript", filename=f"{base_name}.eps")
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=str(e))

@convert_router.post("/eps-to-png")
def convert_eps_to_png(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    _guard_eps(file)
    in_path = save_upload(file)
    out_path = None
    try:
        out_path = image_tools_service.convert_image_magick(in_path, "png", ["-density", "300"])
        background_tasks.add_task(cleanup_files, in_path, out_path)
        base_name = os.path.splitext(file.filename or 'image')[0]
        return FileResponse(out_path, media_type="image/png", filename=f"{base_name}.png")
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=str(e))

@convert_router.post("/eps-to-jpg")
def convert_eps_to_jpg(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    _guard_eps(file)
    in_path = save_upload(file)
    out_path = None
    try:
        out_path = image_tools_service.convert_image_magick(in_path, "jpg", ["-density", "300"])
        background_tasks.add_task(cleanup_files, in_path, out_path)
        base_name = os.path.splitext(file.filename or 'image')[0]
        return FileResponse(out_path, media_type="image/jpeg", filename=f"{base_name}.jpg")
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=str(e))

@convert_router.post("/eps-to-svg")
def convert_eps_to_svg(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    _guard_eps(file)
    in_path = save_upload(file)
    out_path = None
    try:
        out_path = image_tools_service.convert_image_magick(in_path, "svg")
        background_tasks.add_task(cleanup_files, in_path, out_path)
        base_name = os.path.splitext(file.filename or 'image')[0]
        return FileResponse(out_path, media_type="image/svg+xml", filename=f"{base_name}.svg")
    except Exception as e:
        cleanup_files(in_path, out_path)
        raise HTTPException(status_code=500, detail=str(e))


@convert_router.post("/png-to-tiff")
def convert_png_to_tiff(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf = image_tools_service.png_to_tiff(file.file)
        return _stream(buf, "image/tiff", "image.tiff", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@convert_router.post("/jpg-to-tiff")
def convert_jpg_to_tiff(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    import gc
    try:
        buf = image_tools_service.jpg_to_tiff(file.file)
        return _stream(buf, "image/tiff", "image.tiff", background_tasks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()

@image_router.post("/font-awesome-to-png")
def font_awesome_to_png(
    background_tasks: BackgroundTasks,
    icon_unicode: str = Form(...),
    size: int = Form(...),
    color: str = Form(...)
):
    import gc
    try:
        buf = image_tools_service.font_awesome_to_png(icon_unicode, size, color)
        
        return StreamingResponse(
            buf,
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="icon_{icon_unicode.strip()}.png"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        gc.collect()
