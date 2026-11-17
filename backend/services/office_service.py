import os
import subprocess
import shutil
from typing import IO

def _run_subprocess(cmd: list) -> None:
    try:
        subprocess.run(
            cmd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=600,
        )
    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        raise RuntimeError(f"Command '{cmd[0]}' failed: {error_msg}")
    except FileNotFoundError:
        raise RuntimeError(f"Command '{cmd[0]}' not found. Please ensure it is installed and in your system's PATH.")

def _save_stream(file_stream: IO[bytes], file_path: str) -> None:
    file_stream.seek(0)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file_stream, f)

UNOSERVER_HOST = os.environ.get("UNOSERVER_HOST", "127.0.0.1")
UNOSERVER_PORT = os.environ.get("UNOSERVER_PORT", "2003")

def _convert_via_libreoffice(input_path: str, temp_dir: str, convert_to: str = "pdf") -> str:
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(temp_dir, f"{base_name}.{convert_to}")

    try:
        _run_subprocess([
            "unoconvert",
            "--host", UNOSERVER_HOST,
            "--port", UNOSERVER_PORT,
            "--convert-to", convert_to,
            input_path,
            output_path,
        ])
    except RuntimeError:
        profile_dir = os.path.join(temp_dir, "libreoffice_profile")
        os.makedirs(profile_dir, exist_ok=True)

        _run_subprocess([
            "libreoffice",
            f"-env:UserInstallation=file://{profile_dir}",
            "--headless",
            "--invisible",
            "--nologo",
            "--convert-to", convert_to,
            "--outdir", temp_dir,
            input_path
        ])

    return output_path

def convert_word_to_pdf(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    input_path = os.path.join(temp_dir, filename)
    _save_stream(file_stream, input_path)
    return _convert_via_libreoffice(input_path, temp_dir)

def convert_ppt_to_pdf(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    input_path = os.path.join(temp_dir, filename)
    _save_stream(file_stream, input_path)
    return _convert_via_libreoffice(input_path, temp_dir)

def convert_eml_to_pdf(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    base_name = os.path.splitext(filename)[0]
    input_path = os.path.join(temp_dir, f"{base_name}.txt") 
    _save_stream(file_stream, input_path)
    return _convert_via_libreoffice(input_path, temp_dir)

def convert_msg_to_pdf(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    input_path = os.path.join(temp_dir, filename)
    _save_stream(file_stream, input_path)

    base_name = os.path.splitext(filename)[0]
    txt_path = os.path.join(temp_dir, f"{base_name}.txt")
    
    _run_subprocess(["msgconvert", "--outfile", txt_path, input_path])

    return _convert_via_libreoffice(txt_path, temp_dir)

def convert_pdf_to_word(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    from pdf2docx import Converter
    
    input_path = os.path.join(temp_dir, filename)
    _save_stream(file_stream, input_path)

    base_name = os.path.splitext(filename)[0]
    output_path = os.path.join(temp_dir, f"{base_name}.docx")

    cv = Converter(input_path)
    cv.convert(output_path)
    cv.close()
    
    return output_path

def convert_pdf_to_ppt(file_stream: IO[bytes], filename: str, temp_dir: str) -> str:
    import pdfplumber
    from pptx import Presentation
    from pptx.util import Pt
    
    input_path = os.path.join(temp_dir, filename)
    _save_stream(file_stream, input_path)

    base_name = os.path.splitext(filename)[0]
    output_path = os.path.join(temp_dir, f"{base_name}.pptx")

    prs = Presentation()
    with pdfplumber.open(input_path) as pdf:
        for page in pdf.pages:
            slide = prs.slides.add_slide(prs.slide_layouts[6]) 
            
            text = page.extract_text()
            if text:
                tx_box = slide.shapes.add_textbox(Pt(20), Pt(20), Pt(680), Pt(400))
                tf = tx_box.text_frame
                tf.text = text
            
            for img in page.images:
                try:
                    bbox = (img["x0"], img["top"], img["x1"], img["bottom"])
                    cropped_page = page.crop(bbox)
                    img_obj = cropped_page.to_image()
                    img_path = os.path.join(temp_dir, f"temp_img_{img['page_number']}_{img['object_type']}.png")
                    img_obj.save(img_path, format="PNG")
                    slide.shapes.add_picture(img_path, Pt(img["x0"]), Pt(img["top"]), width=Pt(img["width"]), height=Pt(img["height"]))
                except Exception:
                    pass 
                    
    prs.save(output_path)
    return output_path