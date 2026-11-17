import os
import tempfile
import shutil
import zipfile
from typing import IO
from PIL import Image

def _save_images_as_pdf(images_to_process: list[Image.Image]) -> str:
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)

    processed_images = []
    for image in images_to_process:
        if image.mode != "RGB":
            rgb_image = image.convert("RGB")
            image.close()
            processed_images.append(rgb_image)
        else:
            processed_images.append(image)
            
    if processed_images:
        processed_images[0].save(
            pdf_path, "PDF", resolution=100.0, save_all=True, append_images=processed_images[1:]
        )
        
    for img in processed_images:
        img.close()
        
    return pdf_path

def convert_images_to_pdf(file_streams: list[IO[bytes]]) -> str:
    images = [Image.open(stream) for stream in file_streams]
    return _save_images_as_pdf(images)

def convert_heic_to_pdf(file_streams: list[IO[bytes]]) -> str:
    import pillow_heif
    pillow_heif.register_heif_opener()
    
    return convert_images_to_pdf(file_streams)

def convert_eps_to_pdf(file_streams: list[IO[bytes]]) -> str:
    eps_paths = []
    images = []

    try:
        for stream in file_streams:
            eps_fd, eps_path = tempfile.mkstemp(suffix=".eps")
            eps_paths.append(eps_path)
            with os.fdopen(eps_fd, "wb") as f:
                f.write(stream.read())

            image = Image.open(eps_path)
            image.load() 
            images.append(image)
            
        return _save_images_as_pdf(images)
        
    finally:
        for eps_path in eps_paths:
            if os.path.exists(eps_path):
                os.remove(eps_path)

def convert_pdf_to_images(file_stream: IO[bytes], output_format: str) -> str:
    from pdf2image import convert_from_path
    from pdf2image.exceptions import PDFPageCountError

    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    out_dir = tempfile.mkdtemp()

    try:
        file_stream.seek(0)
        with os.fdopen(pdf_fd, "wb") as f:
            shutil.copyfileobj(file_stream, f)

        try:
            images = convert_from_path(pdf_path)
        except PDFPageCountError:
            raise ValueError("The uploaded file is not a valid PDF or is corrupted.")
            
        pil_format = output_format.upper() if output_format != "jpg" else "JPEG"

        if len(images) == 1:
            final_fd, final_path = tempfile.mkstemp(suffix=f".{output_format}")
            os.close(final_fd)
            images[0].save(final_path, format=pil_format)
            images[0].close()
            return final_path
        else:
            zip_fd, zip_path = tempfile.mkstemp(suffix=".zip")
            os.close(zip_fd)

            with zipfile.ZipFile(zip_path, "w") as zipf:
                for i, image in enumerate(images):
                    img_filename = f"page_{i+1}.{output_format}"
                    img_path = os.path.join(out_dir, img_filename)
                    image.save(img_path, format=pil_format)
                    zipf.write(img_path, arcname=img_filename)
                    image.close()

            return zip_path
    finally:
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if os.path.exists(out_dir):
            shutil.rmtree(out_dir)