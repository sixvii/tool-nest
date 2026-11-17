import gc
import os
import tempfile
from typing import IO, List


def parse_page_ranges(page_ranges: str) -> List[int]:
    """Parse a page-range spec like '0-2, 4, 6-8' into an ordered list of 0-based
    page indices. Reversed ranges (e.g. '5-2') are normalised low→high, blank
    parts are ignored, and a non-integer part raises ValueError (callers surface
    that as a 400). Order is preserved and duplicates are kept, so a caller that
    wants a set membership check can wrap the result in set()."""
    indices: List[int] = []
    for part in page_ranges.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start = int(start_str.strip())
            end = int(end_str.strip())
            if start > end:
                start, end = end, start
            indices.extend(range(start, end + 1))
        else:
            indices.append(int(part))
    return indices


def merge_pdfs(file_streams: List[IO[bytes]]) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        writer = PdfWriter()
        for stream in file_streams:
            reader = PdfReader(stream)
            writer.append_pages_from_reader(reader)
            
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def split_pdf(file_stream: IO[bytes], page_ranges: str) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        num_pages = len(reader.pages)

        indices = parse_page_ranges(page_ranges)

        for idx in indices:
            if 0 <= idx < num_pages:
                writer.add_page(reader.pages[idx])
            else:
                raise ValueError(f"Page index {idx} out of bounds.")
                
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def rotate_pdf(file_stream: IO[bytes], degrees: int, page_ranges: str = None) -> str:
    from pypdf import PdfReader, PdfWriter
    import tempfile
    import os
    import gc
    
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        num_pages = len(reader.pages)
        
        if page_ranges:
            indices_to_rotate = set(parse_page_ranges(page_ranges))
        else:
            indices_to_rotate = set(range(num_pages))
            
        for i, page in enumerate(reader.pages):
            if i in indices_to_rotate:
                writer.add_page(page.rotate(degrees))
            else:
                writer.add_page(page) 
                
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def rearrange_pdf(file_stream: IO[bytes], page_indices: List[int]) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        num_pages = len(reader.pages)
        for idx in page_indices:
            if 0 <= idx < num_pages:
                writer.add_page(reader.pages[idx])
            else:
                raise ValueError(f"Page index {idx} out of bounds.")
                
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def delete_pages_pdf(file_stream: IO[bytes], pages_to_drop: List[int]) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        for i, page in enumerate(reader.pages):
            if i not in pages_to_drop:
                writer.add_page(page)
                
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def crop_pdf(file_stream: IO[bytes], x_percent: float, y_percent: float, width_percent: float, height_percent: float) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        for page in reader.pages:
            orig_left = float(page.mediabox.left)
            orig_bottom = float(page.mediabox.bottom)
            orig_width = float(page.mediabox.width)
            orig_height = float(page.mediabox.height)
            orig_top = orig_bottom + orig_height
            
            new_left = orig_left + (x_percent / 100.0) * orig_width
            new_right = new_left + (width_percent / 100.0) * orig_width
            new_top = orig_top - (y_percent / 100.0) * orig_height
            new_bottom = new_top - (height_percent / 100.0) * orig_height
            
            page.mediabox.lower_left = (new_left, new_bottom)
            page.mediabox.upper_right = (new_right, new_top)
            page.cropbox.lower_left = (new_left, new_bottom)
            page.cropbox.upper_right = (new_right, new_top)
            writer.add_page(page)
            
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def resize_pdf(file_stream: IO[bytes], width: float, height: float) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        for page in reader.pages:
            orig_width = float(page.mediabox.width)
            orig_height = float(page.mediabox.height)
            
            scale_x = width / orig_width if orig_width else 1.0
            scale_y = height / orig_height if orig_height else 1.0
            
            page.scale(scale_x, scale_y)
            writer.add_page(page)
            
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def compress_pdf(file_stream: IO[bytes], compression_level: int = 4) -> str:
    import subprocess
    from services.sandbox import ghostscript_preexec
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    in_fd, in_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    levels = {
        0: "/default",
        1: "/prepress", 
        2: "/printer",  
        3: "/ebook",    
        4: "/screen"    
    }
    pdf_settings = levels.get(compression_level, "/screen")
    
    try:
        with os.fdopen(in_fd, "wb") as f:
            f.write(file_stream.read())
            
        cmd = ["gs", "-dSAFER", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", f"-dPDFSETTINGS={pdf_settings}", "-dNOPAUSE", "-dQUIET", "-dBATCH", f"-sOutputFile={pdf_path}", in_path]
        # preexec rlimits bound a hostile PDF's CPU/output blast radius (see
        # services/sandbox.py), on top of -dSAFER and the wall-clock timeout.
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       timeout=300, preexec_fn=ghostscript_preexec)
        return pdf_path
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)
        gc.collect()

def protect_pdf(file_stream: IO[bytes], password: str) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        writer = PdfWriter()
        writer.append_pages_from_reader(reader)
        writer.encrypt(password)
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()

def unlock_pdf(file_stream: IO[bytes], password: str) -> str:
    from pypdf import PdfReader, PdfWriter
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        reader = PdfReader(file_stream)
        if reader.is_encrypted:
            reader.decrypt(password)
        writer = PdfWriter()
        writer.append_pages_from_reader(reader)
        with open(pdf_path, "wb") as f:
            writer.write(f)
        return pdf_path
    finally:
        gc.collect()



def watermark_pdf(
    file_stream: IO[bytes], 
    text: str = None, 
    image_stream: IO[bytes] = None,
    x: float = 0.0,
    y: float = 0.0,
    font_size: float = 36.0,
    color_hex: str = "#808080",
    opacity: float = 0.5,
    rotation: float = 0.0,
    page_from: int = 0,
    page_to: int = None,
    position: str = None,
    layer: str = "over",
    mosaic: bool = False
) -> str:
    import fitz
    import tempfile
    import os
    import gc
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)

    MARGIN_PCT = 0.05  
    NUDGE_X = 0      
    NUDGE_Y = -18       
    
    def hex_to_rgb(hex_str: str):
        hex_str = hex_str.lstrip('#')
        if len(hex_str) != 6:
            return (0.5, 0.5, 0.5)
        return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))
        
    try:
        doc = fitz.open(stream=file_stream.read(), filetype="pdf")
        rgb_color = hex_to_rgb(color_hex)
        overlay = (layer.lower() != "under")
        
        img_data = None
        tw, th = 0, 0
        
        if image_stream:
            img_data = image_stream.read()
            img_pix = fitz.Pixmap(img_data)
            tw, th = img_pix.width, img_pix.height
            
            max_w = 250
            if tw > max_w:
                scale = max_w / tw
                tw = int(tw * scale)
                th = int(th * scale)
        elif text:
            tw = fitz.get_text_length(text, fontname="helv", fontsize=font_size)
            th = font_size
        
        if page_to is None or page_to >= len(doc):
            page_to = len(doc) - 1
            
        for page_idx in range(len(doc)):
            if not (page_from <= page_idx <= page_to):
                continue
                
            page = doc[page_idx]
            rect = page.rect

            margin_x = rect.width * MARGIN_PCT
            margin_y = rect.height * MARGIN_PCT
            
            positions = []
            
            if mosaic:
                import math
                rad = math.radians(rotation)
                
                actual_w = abs(tw * math.cos(rad)) + abs(th * math.sin(rad))
                actual_h = abs(tw * math.sin(rad)) + abs(th * math.cos(rad))
                
                step_x = max(int(actual_w + 80), 80)
                step_y = max(int(actual_h + 80), 80)
                
                for mx in range(0, int(rect.width), step_x):
                    for my in range(0, int(rect.height), step_y):
                        positions.append((mx, my))
            else:
                px, py = x, y
                if position:
                    pos = position.lower()
                    if "top" in pos: 
                        py = margin_y
                    elif "bottom" in pos: 
                        py = rect.height - th - margin_y
                    elif "middle" in pos or "center" in pos: 
                        py = (rect.height - th) / 2
                    
                    if "left" in pos: 
                        px = margin_x
                    elif "right" in pos: 
                        px = rect.width - tw - margin_x
                    elif "center" in pos: 
                        px = (rect.width - tw) / 2
                positions.append((px, py))
            
            for px, py in positions:
                px += NUDGE_X
                py += NUDGE_Y

                if text:
                    p = fitz.Point(px, py + th)
                    center = fitz.Point(px + tw / 2, py + th / 2)
                    morph = (center, fitz.Matrix(rotation)) if rotation else None
                    
                    page.insert_text(
                        p, 
                        text, 
                        fontname="helv", 
                        fontsize=font_size, 
                        color=rgb_color, 
                        fill_opacity=opacity, 
                        overlay=overlay,
                        morph=morph
                    )
                elif img_data:
                    img_rect = fitz.Rect(px, py, px + tw, py + th)
                    page.insert_image(img_rect, stream=img_data, overlay=overlay)
        doc.save(pdf_path)
        doc.close()
        return pdf_path
    finally:
        gc.collect()
        
        

def extract_images_pdf(file_stream: IO[bytes]) -> str:
    import fitz 
    import zipfile
    import shutil
    
    out_dir = tempfile.mkdtemp()
    zip_fd, zip_path = tempfile.mkstemp(suffix=".zip")
    os.close(zip_fd)
    
    try:
        doc = fitz.open(stream=file_stream.read(), filetype="pdf")
        image_paths = []
        img_index = 0
        extracted_xrefs = set()
        for i in range(len(doc)):
            page = doc[i]
            for img in page.get_images(full=True):
                xref = img[0]
                if xref in extracted_xrefs:
                    continue
                extracted_xrefs.add(xref)
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                img_path = os.path.join(out_dir, f"image_{img_index}.{image_ext}")
                with open(img_path, "wb") as f:
                    f.write(image_bytes)
                image_paths.append(img_path)
                img_index += 1
                
        doc.close()
        
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for img_path in image_paths:
                zipf.write(img_path, arcname=os.path.basename(img_path))
                
        return zip_path
    finally:
        if os.path.exists(out_dir):
            shutil.rmtree(out_dir)
        gc.collect()

def parse_pdf(file_stream: IO[bytes]) -> dict:
    import fitz
    
    doc = fitz.open(stream=file_stream.read(), filetype="pdf")
    result = {"pages": []}

    for page_index in range(len(doc)):
        page = doc[page_index]
        page_data = {"page_index": page_index, "blocks": []}
        block_id_counter = 1

        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            if block.get("type") == 0: 
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if not text:
                            continue

                        color_int = span.get("color", 0)
                        color_hex = f"#{color_int:06x}" if isinstance(color_int, int) else "#000000"

                        flags = span.get("flags", 0)
                        is_bold = bool(flags & 2 ** 4) 
                        is_italic = bool(flags & 2 ** 1)
                        font_family = span.get("font", "Arial")

                        page_data["blocks"].append({
                            "id": f"block_{page_index}_{block_id_counter}",
                            "text": text,
                            "x": round(span["bbox"][0], 2),
                            "y": round(span["bbox"][1], 2),
                            "width": round(span["bbox"][2] - span["bbox"][0], 2),
                            "height": round(span["bbox"][3] - span["bbox"][1], 2),
                            "font_size": round(span["size"], 1),
                            "color_hex": color_hex,
                            "font_family": font_family,
                            "bold": is_bold,
                            "italic": is_italic
                        })
                        block_id_counter += 1
                        
        result["pages"].append(page_data)
        
    doc.close()
    return result


def edit_pdf(file_stream: IO[bytes], elements_json: str, assets: dict) -> str:
    import fitz
    import json
    import tempfile
    import os
    import gc

    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)

    def hex_to_rgb(hex_str: str):
        hex_str = hex_str.lstrip('#')
        if len(hex_str) != 6:
            return (0, 0, 0)
        return tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))

    try:
        doc = fitz.open(stream=file_stream.read(), filetype="pdf")
        elements = json.loads(elements_json)

        for i, el in enumerate(elements):
            page_idx = el.get("page_index", 0)
            if not (0 <= page_idx < len(doc)):
                continue
                
            page = doc[page_idx]
            el_type = el.get("type")
            x = el.get("x", 0)
            y = el.get("y", 0)

            if el_type == "erase":
                w = el.get("w", 50)
                h = el.get("h", 15)
                rect = fitz.Rect(x, y, x + w, y + h)
                
                page.add_redact_annot(rect, fill=(1, 1, 1))
                page.apply_redactions()
                continue 

            if el_type == "text":
                rgb_color = hex_to_rgb(el.get("color_hex", "#000000"))
                font_size = el.get("font_size", 12)
                page.insert_text((x, y + font_size), el.get("text", ""), fontsize=font_size, color=rgb_color)

            elif el_type == "shape":
                w = el.get("w", 100)
                h = el.get("h", 100)
                rect = fitz.Rect(x, y, x + w, y + h)
                
                stroke_color = hex_to_rgb(el.get("color_hex", "#000000"))
                fill_val = el.get("fill_color")
                fill_rgb = hex_to_rgb(fill_val) if fill_val and fill_val != "transparent" else None

                if el.get("shape_type") == "rect":
                    page.draw_rect(rect, color=stroke_color, fill=fill_rgb, width=1.5)
                elif el.get("shape_type") == "circle":
                    page.draw_oval(rect, color=stroke_color, fill=fill_rgb, width=1.5)

            elif el_type in ["image", "drawing"]:
                asset_key = el.get("file_key", f"{el_type}_{i}")
                
                if asset_key in assets:
                    w = el.get("w", 100)
                    h = el.get("h", 100)
                    rect = fitz.Rect(x, y, x + w, y + h)
                    page.insert_image(rect, stream=assets[asset_key])

        doc.save(pdf_path)
        doc.close()
        return pdf_path
        
    finally:
        gc.collect()

def replace_text_pdf(
    file_stream: IO[bytes], 
    search_text: str, 
    replace_text: str, 
    mode: str = "all", 
    match_index: int = 0
) -> str:
    import fitz 
    import tempfile
    import os
    import gc
    
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        doc = fitz.open(stream=file_stream.read(), filetype="pdf")
        global_counter = 0
        
        for page in doc:
            text_instances = page.search_for(search_text)
            instances_to_replace = []
            
            for inst in text_instances:
                if mode.lower() == "single":
                    if global_counter == match_index:
                        instances_to_replace.append(inst)
                else:
                    instances_to_replace.append(inst)
                global_counter += 1
            
            if instances_to_replace:
                text_dict = page.get_text("dict")
                
                exact_details = []
                
                for inst in instances_to_replace:
                    exact_size = inst.height * 0.85 
                    baseline_y = inst.y1 - (inst.height * 0.15)
                    
                    for block in text_dict.get("blocks", []):
                        if block.get("type") != 0: 
                            continue 
                        for line in block.get("lines", []):
                            for span in line.get("spans", []):
                                span_rect = fitz.Rect(span["bbox"])
                                if span_rect.intersects(inst):
                                    exact_size = span["size"] 
                                    baseline_y = span["origin"][1] 
                                    break
                                    
                    exact_details.append({
                        "rect": inst,
                        "size": exact_size,
                        "y": baseline_y
                    })

                for detail in exact_details:
                    page.add_redact_annot(detail["rect"], fill=(1, 1, 1))  
                page.apply_redactions()
                
                for detail in exact_details:
                    page.insert_text(
                        (detail["rect"].x0, detail["y"]), 
                        replace_text, 
                        fontsize=detail["size"], 
                        color=(0, 0, 0)
                    )
                
        doc.save(pdf_path)
        doc.close()
        return pdf_path
        
    finally:
        gc.collect()

def esign_pdf(
    file_stream: IO[bytes],
    signature_type: str = "certificate",
    cert_stream: IO[bytes] = None,
    password: str = None,
    signature_text: str = None,
    signature_image_stream: IO[bytes] = None,
    signature_font: str = None,
    font_size: int = 24,
    x: float = 0.0,
    y: float = 0.0,
    page_num: int = 1
) -> str:
    import os
    import tempfile
    import gc
    import fitz
    
    in_fd, in_path = tempfile.mkstemp(suffix=".pdf")
    pdf_fd, pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(pdf_fd)
    
    try:
        file_stream.seek(0)
        with os.fdopen(in_fd, "wb") as f:
            f.write(file_stream.read())
            
        doc = fitz.open(in_path)
        page_index = max(0, page_num - 1)
        if page_index >= len(doc):
            page_index = len(doc) - 1
            
        target_page = doc[page_index]
        page_width = target_page.rect.width
        page_height = target_page.rect.height
        
        actual_x = x * page_width
        actual_y = y * page_height
            
        if signature_type == "certificate":
            doc.close()
            if not (cert_stream and password):
                raise ValueError("Certificate and password are required for certificate signature.")
            from pyhanko.sign import signers, fields
            from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
            
            cert_fd, cert_path = tempfile.mkstemp(suffix=".p12")
            try:
                cert_stream.seek(0)
                with os.fdopen(cert_fd, "wb") as f:
                    f.write(cert_stream.read())
                
                signer = signers.SimpleSigner.load_pkcs12(
                    pfx_file=cert_path, 
                    passphrase=password.encode()
                )
                
                with open(in_path, 'rb') as doc_stream:
                    pdf_writer = IncrementalPdfFileWriter(doc_stream)
                    
                    sig_field_name = 'Signature1'
                    pyhanko_y = page_height - actual_y - 50
                    fields.append_signature_field(
                        pdf_writer,
                        sig_field_spec=fields.SigFieldSpec(sig_field_name, box=(actual_x, pyhanko_y, actual_x+150, pyhanko_y+50))
                    )
                    
                    with open(pdf_path, 'wb') as out_f:
                        signers.sign_pdf(
                            pdf_out=pdf_writer, 
                            signature_meta=signers.PdfSignatureMetadata(field_name=sig_field_name), 
                            signer=signer, 
                            output=out_f
                        )
            finally:
                if os.path.exists(cert_path):
                    os.remove(cert_path)
        elif signature_type == "text" and signature_text:
            fontname = "helv" 
            fontfile = None
            
            if signature_font:
                sf = signature_font.lower()
                
                google_fonts = [
                    "great-vibes", "pinyon-script", "mrs-saint-delafield", 
                    "dancing-script", "pacifico", "satisfy", "caveat", 
                    "indie-flower", "permanent-marker", "rock-salt"
                ]
                
                if sf in google_fonts:
                    fontname = sf.replace("-", "") 
                    current_dir = os.path.dirname(os.path.abspath(__file__))
                    fontfile = os.path.join(current_dir, "fonts", f"{sf}.ttf")
                elif sf in ("mono", "monospace", "courier"):
                    fontname = "cour"  
                elif sf in ("cursive", "script", "italic"):
                    fontname = "tiit"  
                elif sf in ("serif", "times", "times new roman"):
                    fontname = "tiro"  
                elif sf in ("sans-serif", "sans", "helvetica", "arial"):
                    fontname = "helv"  
            
            if fontfile and os.path.exists(fontfile):
                target_page.insert_font(fontname=fontname, fontfile=fontfile)
            elif fontfile:
                fontname = "tiit"
            
            navy_ink = (30/255.0, 41/255.0, 80/255.0)
            ink_opacity = 0.82
            
            target_page.insert_text(
                (actual_x, actual_y + font_size), 
                signature_text, 
                fontsize=font_size, 
                color=navy_ink,             
                fill_opacity=ink_opacity,  
                fontname=fontname
            )
            doc.save(pdf_path)
            doc.close()
        elif signature_type in ("image", "draw") and signature_image_stream:
            img_data = signature_image_stream.read()
            img_rect = fitz.Rect(actual_x, actual_y, actual_x + 150, actual_y + 50)
            target_page.insert_image(img_rect, stream=img_data, keep_proportion=True)
            doc.save(pdf_path)
            doc.close()
        else:
            doc.close()
            raise ValueError(f"Invalid signature setup or missing required data for type '{signature_type}'.")
            
        return pdf_path
    finally:
        if os.path.exists(in_path):
            os.remove(in_path)
        gc.collect()
