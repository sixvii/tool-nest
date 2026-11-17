import gc
import io
import os
import subprocess
import tempfile
import zipfile
from functools import lru_cache
from typing import IO, Tuple, List


@lru_cache(maxsize=2)
def _rembg_session(model_name: str = "isnet-general-use"):
    """Lazily create and cache one rembg session per model, per worker process.

    The ONNX model is expensive to load (hundreds of MB, seconds of CPU).
    Previously every remove-/blur-background call built a fresh session and
    threw it away — the dominant cost in those endpoints. Caching it means the
    model loads once per worker and is reused for the life of the process.
    ``rembg`` is imported lazily inside so the import cost is paid only when
    background removal is actually used.
    """
    import rembg
    return rembg.new_session(model_name)

def resize_image(file_stream: IO[bytes], width: int, height: int) -> Tuple[io.BytesIO, str]:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        img = img.resize((width, height), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()

def compress_image(file_stream: IO[bytes], quality: int) -> io.BytesIO:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        return buf
    finally:
        gc.collect()

def jpg_to_tiff(file_stream: IO[bytes]) -> io.BytesIO:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        if img.mode == "RGBA":
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="TIFF")
        return buf
    finally:
        gc.collect()

def font_awesome_to_png(icon_unicode: str, size: int, color: str):
    from PIL import Image, ImageDraw, ImageFont
    import os
    import io
    import gc

    clean_unicode = icon_unicode.replace("U+", "").replace("\\u", "").strip()
    try:
        char = chr(int(clean_unicode, 16))
    except ValueError:
        raise ValueError(f"Invalid unicode format: {icon_unicode}")

    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    current_dir = os.path.dirname(os.path.abspath(__file__))
    font_path = os.path.join(current_dir, "fonts", "fa-solid-900.ttf")

    try:
        font = ImageFont.truetype(font_path, int(size * 0.85))
    except IOError:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), char, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]

    draw.text((x, y), char, font=font, fill=color)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    gc.collect()
    
    return buf

def crop_image(file_stream: IO[bytes], x: int, y: int, width: int, height: int) -> Tuple[io.BytesIO, str]:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        cropped = img.crop((x, y, x + width, y + height))
        buf = io.BytesIO()
        cropped.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()

def round_image(file_stream: IO[bytes]) -> io.BytesIO:
    from PIL import Image, ImageDraw
    try:
        img = Image.open(file_stream).convert("RGBA")
        size = min(img.size)
        img = img.crop((
            (img.width - size) // 2,
            (img.height - size) // 2,
            (img.width + size) // 2,
            (img.height + size) // 2,
        ))
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        img.putalpha(mask)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf
    finally:
        gc.collect()

FONT_MAP = {
    "Arial": "LiberationSans-Bold.ttf",
    "Georgia": "Gelasio-Bold.ttf",
    "Times New Roman": "LiberationSerif-Bold.ttf",
    "Courier New": "LiberationMono-Bold.ttf",
    "Verdana": "DejaVuSans-Bold.ttf",
    "Impact": "Anton-Regular.ttf",
    "Comic Sans MS": "ComicNeueSansID.ttf",
}


def add_text_to_image(
    file_stream: IO[bytes],
    text: str,
    x: int,
    y: int,
    font_size: int,
    color: str,
    font_family: str = "Arial",
    rotation: float = 0.0,
) -> Tuple[io.BytesIO, str]:
    from PIL import Image, ImageDraw, ImageFont
    import io
    import os
    import gc

    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        img = img.convert("RGBA")

        current_dir = os.path.dirname(os.path.abspath(__file__))

        clean_font = str(font_family).strip().replace('"', '').replace("'", "")
        
        font_key = next((k for k in FONT_MAP.keys() if k.lower() == clean_font.lower()), "Arial")
        font_filename = FONT_MAP[font_key]
        font_path = os.path.join(current_dir, "fonts", font_filename)

        if not os.path.exists(font_path):
            print(f"FONT ERROR: Looking for {font_path} but it does not exist!", flush=True)
            
        try:
            font = ImageFont.truetype(font_path, font_size)
        except IOError as e:
            print(f"FONT LOAD ERROR: {e}", flush=True)
            font = ImageFont.load_default()

        if rotation == 0.0:
            draw = ImageDraw.Draw(img)
            draw.text((x, y), text, fill=color, font=font, anchor="mm")
        else:
            dummy_draw = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
            left, top, right, bottom = dummy_draw.textbbox((0, 0), text, font=font, anchor="mm")
            text_w = right - left
            text_h = bottom - top

            pad = 20 
            layer_w = text_w + (pad * 2)
            layer_h = text_h + (pad * 2)
            
            txt_layer = Image.new("RGBA", (int(layer_w), int(layer_h)), (0, 0, 0, 0))
            txt_draw = ImageDraw.Draw(txt_layer)
            
            txt_draw.text((layer_w / 2, layer_h / 2), text, fill=color, font=font, anchor="mm")

            rotated_layer = txt_layer.rotate(-rotation, expand=True, resample=Image.BICUBIC)

            paste_x = int(x - (rotated_layer.width / 2))
            paste_y = int(y - (rotated_layer.height / 2))

            img.paste(rotated_layer, (paste_x, paste_y), rotated_layer)

        buf = io.BytesIO()
        if fmt.upper() in ["JPEG", "JPG"]:
            img = img.convert("RGB")

        img.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()



        

def convert_image_format(file_stream: IO[bytes], target_format: str) -> str:
    from PIL import Image
    pil_format = "JPEG" if target_format == "jpg" else target_format.upper()
    out_fd, out_path = tempfile.mkstemp(suffix=f".{target_format}")
    os.close(out_fd)

    try:
        image = Image.open(file_stream)

        if target_format == "jpg" and image.mode != "RGB":
            image = image.convert("RGB")

        image.save(out_path, format=pil_format)
        return out_path
    finally:
        gc.collect()

def convert_to_avif(file_stream: IO[bytes]) -> io.BytesIO:
    from PIL import Image
    import pillow_avif # noqa: F401 - registers AVIF codec with Pillow, side-effect import
    
    try:
        img = Image.open(file_stream)
        
        if img.mode == "P":
            img = img.convert("RGBA")
        elif img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
            
        buf = io.BytesIO()
        img.save(buf, format="AVIF")
        
        buf.seek(0) 
        
        return buf
    finally:
        gc.collect()

def convert_tiff(file_stream: IO[bytes], target_format: str) -> Tuple[str, bool]:
    from PIL import Image, ImageSequence

    pil_format = "JPEG" if target_format == "jpg" else target_format.upper()

    try:
        img = Image.open(file_stream)
        frames = list(ImageSequence.Iterator(img))

        if len(frames) > 1:
            out_dir = tempfile.mkdtemp()
            zip_fd, zip_path = tempfile.mkstemp(suffix=".zip")
            os.close(zip_fd)

            try:
                with zipfile.ZipFile(zip_path, "w") as zipf:
                    for i, frame in enumerate(frames):
                        page = frame.convert("RGB") if target_format == "jpg" else frame.copy()
                        page_filename = f"page_{i + 1}.{target_format}"
                        page_path = os.path.join(out_dir, page_filename)
                        page.save(page_path, format=pil_format)
                        zipf.write(page_path, arcname=page_filename)
                return zip_path, True
            finally:
                import shutil
                if os.path.exists(out_dir):
                    shutil.rmtree(out_dir)
        else:
            frame = frames[0].convert("RGB") if target_format == "jpg" else frames[0]
            out_fd, out_path = tempfile.mkstemp(suffix=f".{target_format}")
            os.close(out_fd)
            frame.save(out_path, format=pil_format)
            return out_path, False
    finally:
        gc.collect()

def black_and_white(file_stream: IO[bytes]) -> Tuple[io.BytesIO, str]:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        bw_img = img.convert("L")
        buf = io.BytesIO()
        bw_img.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()

def add_border(file_stream: IO[bytes], border_width: int, color: str, style: str = "solid") -> Tuple[io.BytesIO, str]:
    from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageColor
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        try:
            core_rgb = ImageColor.getrgb(color)
            if len(core_rgb) == 4:
                core_rgb = core_rgb[:3]
        except ValueError:
            core_rgb = (0, 0, 0)
            color = "black"

        light_rgb = tuple(min(255, int(c + (255 - c) * 0.5)) for c in core_rgb)
        dark_rgb = tuple(max(0, int(c * 0.5)) for c in core_rgb)

        img_out = img

        if style == "polaroid":
            img_out = ImageOps.expand(img, border=(border_width, border_width, border_width, int(border_width * 2.5)), fill=color)

        elif style == "matte":
            inner_w = max(1, border_width // 3)
            outer_w = border_width - inner_w
            img_out = ImageOps.expand(img, border=inner_w, fill="white")
            img_out = ImageOps.expand(img_out, border=outer_w, fill=color)

        elif style == "double":
            w = max(1, border_width // 3)
            img_out = ImageOps.expand(img, border=w, fill=color)
            img_out = ImageOps.expand(img_out, border=border_width - (2 * w), fill="white")
            img_out = ImageOps.expand(img_out, border=w, fill=color)

        elif style in ["inset", "outset"]:
            top_left = dark_rgb if style == "inset" else light_rgb
            bottom_right = light_rgb if style == "inset" else dark_rgb
            
            img_out = ImageOps.expand(img, border=border_width, fill=core_rgb)
            draw = ImageDraw.Draw(img_out)
            w, h = img_out.size
            bw = border_width
            draw.polygon([(0,0), (w,0), (w-bw, bw), (bw, bw)], fill=top_left)
            draw.polygon([(0,0), (bw, bw), (bw, h-bw), (0, h)], fill=top_left)
            draw.polygon([(0,h), (bw, h-bw), (w-bw, h-bw), (w, h)], fill=bottom_right)
            draw.polygon([(w,0), (w-bw, bw), (w-bw, h-bw), (w, h)], fill=bottom_right)

        elif style in ["groove", "ridge"]:
            bw_half = max(1, border_width // 2)
            
            outer_tl = dark_rgb if style == "groove" else light_rgb
            outer_br = light_rgb if style == "groove" else dark_rgb
            inner_tl = light_rgb if style == "groove" else dark_rgb
            inner_br = dark_rgb if style == "groove" else light_rgb

            img_out = ImageOps.expand(img, border=border_width, fill=core_rgb)
            draw = ImageDraw.Draw(img_out)
            w, h = img_out.size
            
            draw.polygon([(0,0), (w,0), (w-bw_half, bw_half), (bw_half, bw_half)], fill=outer_tl)
            draw.polygon([(0,0), (bw_half, bw_half), (bw_half, h-bw_half), (0, h)], fill=outer_tl)
            draw.polygon([(0,h), (bw_half, h-bw_half), (w-bw_half, h-bw_half), (w, h)], fill=outer_br)
            draw.polygon([(w,0), (w-bw_half, bw_half), (w-bw_half, h-bw_half), (w, h)], fill=outer_br)
            
            draw.polygon([(bw_half, bw_half), (w-bw_half, bw_half), (w-border_width, border_width), (border_width, border_width)], fill=inner_tl)
            draw.polygon([(bw_half, bw_half), (border_width, border_width), (border_width, h-border_width), (bw_half, h-bw_half)], fill=inner_tl)
            draw.polygon([(bw_half, h-bw_half), (border_width, h-border_width), (w-border_width, h-border_width), (w-bw_half, h-bw_half)], fill=inner_br)
            draw.polygon([(w-bw_half, bw_half), (w-border_width, border_width), (w-border_width, h-border_width), (w-bw_half, h-bw_half)], fill=inner_br)

        elif style == "shadow":
            img_out = ImageOps.expand(img, border=border_width, fill=color)
            shadow_offset = max(5, border_width)
            
            canvas_w = img_out.width + shadow_offset * 3
            canvas_h = img_out.height + shadow_offset * 3
            shadow_canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 0))
            
            shadow_draw = ImageDraw.Draw(shadow_canvas)
            shadow_draw.rectangle(
                [shadow_offset, shadow_offset, shadow_offset + img_out.width, shadow_offset + img_out.height], 
                fill=(0, 0, 0, 150)
            )
            shadow_canvas = shadow_canvas.filter(ImageFilter.GaussianBlur(shadow_offset // 2))
            
            shadow_canvas.paste(img_out, (shadow_offset // 2, shadow_offset // 2))
            img_out = shadow_canvas

        elif style == "rounded":
            img_out = Image.new("RGBA", (img.width + border_width*2, img.height + border_width*2), (255,255,255,0))
            draw = ImageDraw.Draw(img_out)
            radius = border_width * 2
            
            draw.rounded_rectangle([0, 0, img_out.width, img_out.height], radius=radius, fill=color)
            
            img_out.paste(img, (border_width, border_width))

        elif style == "neon":
            pad = border_width * 2
            canvas = Image.new("RGBA", (img.width + pad*2, img.height + pad*2), (15, 15, 15, 255))
            
            glow_bg = core_rgb + (0,)
            glow = Image.new("RGBA", canvas.size, glow_bg)
            
            glow_draw = ImageDraw.Draw(glow)
            glow_draw.rectangle(
                [pad - border_width, pad - border_width, pad + img.width + border_width, pad + img.height + border_width], 
                outline=core_rgb + (255,), 
                width=border_width
            )
            glow = glow.filter(ImageFilter.GaussianBlur(border_width))
            
            core = Image.new("RGBA", canvas.size, (255, 255, 255, 0))
            core_draw = ImageDraw.Draw(core)
            core_draw.rectangle(
                [pad - 1, pad - 1, pad + img.width + 1, pad + img.height + 1], 
                outline=(255, 255, 255, 255), 
                width=max(1, border_width // 4)
            )
            
            canvas = Image.alpha_composite(canvas, glow)
            canvas = Image.alpha_composite(canvas, core)
            
            canvas.paste(img, (pad, pad), mask=img if img.mode == "RGBA" else None)
            img_out = canvas

        elif style in ["dashed", "dotted"]:
            img_out = ImageOps.expand(img, border=border_width, fill="white")
            draw = ImageDraw.Draw(img_out)
            
            step = border_width * 3 if style == "dashed" else border_width * 2
            length = border_width * 2 if style == "dashed" else border_width
            
            w, h = img_out.size
            bw = border_width
            
            for x in range(0, w, step):
                draw.rectangle([x, 0, min(x + length, w), bw], fill=color)          
                draw.rectangle([x, h - bw, min(x + length, w), h], fill=color)      
            for y in range(0, h, step):
                draw.rectangle([0, y, bw, min(y + length, h)], fill=color)          
                draw.rectangle([w - bw, y, w, min(y + length, h)], fill=color)      

        else:
            img_out = ImageOps.expand(img, border=border_width, fill=color)

        buf = io.BytesIO()
        if fmt.upper() == "JPEG":
            img_out = img_out.convert("RGB")
            
        img_out.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()

def pixelate(file_stream: IO[bytes], pixel_size: int) -> Tuple[io.BytesIO, str]:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        pixel_size = max(1, pixel_size)
        small = img.resize((max(1, img.width // pixel_size), max(1, img.height // pixel_size)), Image.NEAREST)
        pixelated = small.resize(img.size, Image.NEAREST)
        buf = io.BytesIO()
        pixelated.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()

def flip_image(file_stream: IO[bytes], direction: str) -> Tuple[io.BytesIO, str]:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        if direction == "horizontal":
            flipped = img.transpose(Image.FLIP_LEFT_RIGHT)
        elif direction == "vertical":
            flipped = img.transpose(Image.FLIP_TOP_BOTTOM)
        else:
            flipped = img
        buf = io.BytesIO()
        flipped.save(buf, format=fmt)
        return buf, fmt.lower()
    finally:
        gc.collect()

def view_metadata(file_stream, filename: str) -> dict:
    import tempfile
    import shutil
    import os
    import gc
    from exiftool import ExifToolHelper

    _, ext = os.path.splitext(filename)
    fd, temp_path = tempfile.mkstemp(suffix=ext.lower() if ext else ".jpg")
    os.close(fd)
    
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file_stream, f)
            
        with ExifToolHelper() as et:
            metadata_list = et.get_metadata(temp_path)
            
        if not metadata_list or len(metadata_list) == 0:
            return {"message": "No metadata found."}
            
        raw_metadata = metadata_list[0]
        
        clean_metadata = {}
        for key, value in raw_metadata.items():
            if key in ("SourceFile", "ExifTool:ExifToolVersion", "ExifTool:Error"):
                continue
                
            if isinstance(value, (bytes, bytearray)):
                continue
                
            clean_metadata[key] = value
            
        return clean_metadata
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        gc.collect()
        
def remove_metadata(file_stream, filename: str):
    from PIL import Image, ImageOps
    import tempfile
    import shutil
    import os
    import gc
    from exiftool import ExifToolHelper

    _, ext = os.path.splitext(filename)
    if not ext:
        ext = ".jpg"

    fd_in, in_path = tempfile.mkstemp()
    fd_out, out_path = tempfile.mkstemp(suffix=ext)
    os.close(fd_in)
    os.close(fd_out)

    try:
        with open(in_path, "wb") as f:
            shutil.copyfileobj(file_stream, f)

        img = Image.open(in_path)
        original_format = img.format or "JPEG"

        if img.mode in ("RGBA", "P") and original_format.upper() == "JPEG":
            img = img.convert("RGB")

        img = ImageOps.exif_transpose(img)

        # Strip carried-forward metadata so PIL's re-save writes a clean file.
        for _k in ("exif", "icc_profile", "xmp"):
            img.info.pop(_k, None)
        img.save(out_path, format=original_format)

        # exiftool is a thorough second pass, but it CANNOT write some formats
        # (WebP/AVIF/HEIC) and returns exit 1 on them. PIL's re-save above already
        # dropped metadata, so skip exiftool for those instead of failing the job.
        if original_format.upper() not in {"WEBP", "AVIF", "HEIF", "HEIC"}:
            with ExifToolHelper() as et:
                et.execute(
                    "-all=", "-icc_profile=", "-xmp:all=",
                    "-overwrite_original", out_path,
                )

        return out_path, ext

    finally:
        if os.path.exists(in_path):
            os.remove(in_path)
        gc.collect()

def blur_background(file_stream: IO[bytes], radius: int) -> Tuple[io.BytesIO, str]:
    from PIL import Image, ImageFilter
    import rembg

    img = Image.open(file_stream).convert("RGBA")

    session = _rembg_session()  # cached; do not delete it
    subject_only = rembg.remove(img, session=session)

    ai_mask = subject_only.split()[3]

    blurred_bg = img.filter(ImageFilter.GaussianBlur(radius))

    composite = Image.composite(img, blurred_bg, ai_mask)

    buf = io.BytesIO()
    composite.save(buf, format="PNG")
    return buf, "png"

def profile_photo_maker(file_stream: IO[bytes], bg_color: str = None) -> Tuple[io.BytesIO, str]:
    from PIL import Image, ImageDraw
    try:
        img = Image.open(file_stream).convert("RGBA")
        size = min(img.size)
        left, top = (img.width - size) // 2, (img.height - size) // 2
        img = img.crop((left, top, left + size, top + size))
        
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        
        out_img = Image.new("RGBA", (size, size), bg_color or (0,0,0,0))
        out_img.paste(img, (0, 0), mask)
        
        buf = io.BytesIO()
        out_img.save(buf, format="PNG")
        return buf, "png"
    finally:
        gc.collect()

def images_to_gif(files: List[IO[bytes]]) -> io.BytesIO:
    from PIL import Image
    try:
        images = [Image.open(f).convert("RGBA") for f in files]
        buf = io.BytesIO()
        if images:
            images[0].save(buf, format="GIF", save_all=True, append_images=images[1:], duration=500, loop=0)
        return buf
    finally:
        gc.collect()

def split_image(file_stream: IO[bytes], rows: int, cols: int, temp_dir: str) -> str:
    from PIL import Image
    import zipfile
    try:
        img = Image.open(file_stream)
        fmt = img.format or "PNG"
        ext = fmt.lower()
        cell_w, cell_h = img.width // cols, img.height // rows
        
        zip_path = os.path.join(temp_dir, "split_images.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for r in range(rows):
                for c in range(cols):
                    left, top = c * cell_w, r * cell_h
                    right = left + cell_w if c < cols - 1 else img.width
                    bottom = top + cell_h if r < rows - 1 else img.height
                    
                    tile = img.crop((left, top, right, bottom))
                    tile_path = os.path.join(temp_dir, f"tile_{r}_{c}.{ext}")
                    tile.save(tile_path, format=fmt)
                    zipf.write(tile_path, arcname=f"tile_{r}_{c}.{ext}")
        return zip_path
    finally:
        gc.collect()

def combine_images(files: List[IO[bytes]], layout: str, temp_dir: str) -> str:
    from PIL import Image
    import math
    try:
        images = [Image.open(f) for f in files]
        if not images:
            raise ValueError("No images provided.")
            
        if layout == "horizontal":
            canvas = Image.new("RGB", (sum(i.width for i in images), max(i.height for i in images)), "white")
            [canvas.paste(img, (sum(i.width for i in images[:idx]), 0)) for idx, img in enumerate(images)]
        elif layout == "vertical":
            canvas = Image.new("RGB", (max(i.width for i in images), sum(i.height for i in images)), "white")
            [canvas.paste(img, (0, sum(i.height for i in images[:idx]))) for idx, img in enumerate(images)]
        else: 
            cols, rows = math.ceil(math.sqrt(len(images))), math.ceil(len(images) / math.ceil(math.sqrt(len(images))))
            cw, ch = max(i.width for i in images), max(i.height for i in images)
            canvas = Image.new("RGB", (cols * cw, rows * ch), "white")
            [canvas.paste(img, ((idx % cols) * cw, (idx // cols) * ch)) for idx, img in enumerate(images)]
            
        out_path = os.path.join(temp_dir, "combined.jpg")
        canvas.save(out_path, format="JPEG")
        return out_path
    finally:
        gc.collect()

def extract_gif_frames(file_stream: IO[bytes], target_format: str) -> Tuple[io.BytesIO, bool]:
    from PIL import Image, ImageSequence
    import zipfile
    try:
        img = Image.open(file_stream)
        mode = "RGB" if target_format.upper() in ("JPEG", "JPG") else "RGBA"
        
        frames = []
        for frame in ImageSequence.Iterator(img):
            frames.append(frame.copy().convert(mode))
            
        buf = io.BytesIO()
        if len(frames) <= 1:
            if frames:
                frames[0].save(buf, format=target_format.upper())
            return buf, False
        else:
            with zipfile.ZipFile(buf, "w") as zipf:
                for i, frame in enumerate(frames):
                    frame_buf = io.BytesIO()
                    frame.save(frame_buf, format=target_format.upper())
                    zipf.writestr(f"frame_{i}.{target_format.lower()}", frame_buf.getvalue())
            return buf, True
    finally:
        gc.collect()

# Resource ceilings for ImageMagick. EPS input is delegated to Ghostscript, so
# these bound what a hostile/oversized document can do (memory/disk exhaustion,
# decompression/pixel bombs, runaway time) independently of the coder policy.
# On breach `convert` errors out and we surface a clean RuntimeError.
_MAGICK_LIMITS = [
    "-limit", "memory", "256MiB",
    "-limit", "map", "512MiB",
    "-limit", "disk", "1GiB",
    "-limit", "area", "128MP",
    "-limit", "time", "60",
]


def convert_image_magick(input_path: str, target_format: str, extra_args: list = None) -> str:
    out_fd, out_path = tempfile.mkstemp(suffix=f".{target_format}")
    os.close(out_fd)

    cmd = ["convert", *_MAGICK_LIMITS]
    if extra_args:
        cmd.extend(extra_args)
    cmd.extend([input_path, out_path])
    
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        return out_path
    except subprocess.CalledProcessError as e:
        if os.path.exists(out_path):
            os.remove(out_path)
        error_msg = e.stderr.decode('utf-8', errors='ignore') if e.stderr else str(e)
        raise RuntimeError(f"ImageMagick error: {error_msg}")
    finally:
        gc.collect()

def png_to_tiff(file_stream: IO[bytes]) -> io.BytesIO:
    from PIL import Image
    try:
        img = Image.open(file_stream)
        if img.mode == "RGBA":
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="TIFF")
        return buf
    finally:
        gc.collect()

def remove_background(file_stream: IO[bytes], alpha_matting: bool = False) -> io.BytesIO:
    """Remove an image's background with rembg.

    alpha_matting refines the cutout edges (hair/fur) but is several× slower and
    heavier — off by default so the common case is fast; callers that want the
    higher-quality edge pass it explicitly.
    """
    import rembg
    from PIL import Image

    session = _rembg_session()  # cached; do not delete it

    img = Image.open(file_stream)

    if alpha_matting:
        out_img = rembg.remove(
            img,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10
        )
    else:
        out_img = rembg.remove(img, session=session)

    buf = io.BytesIO()
    out_img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def image_to_text(file_stream: IO[bytes]) -> io.StringIO:
    import pytesseract
    import tempfile
    import os
    import gc
    import io

    fd, temp_path = tempfile.mkstemp(suffix=".png")
    os.close(fd)
    
    try:
        with open(temp_path, "wb") as f:
            f.write(file_stream.read())
            
        text = pytesseract.image_to_string(temp_path)
        
        buf = io.StringIO()
        buf.write(text)
        buf.seek(0)
        return buf
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        gc.collect()

def tiff_to_text(file_stream) -> io.StringIO:
    import pytesseract
    import tempfile
    import os
    import gc
    import io

    fd, temp_path = tempfile.mkstemp(suffix=".tiff")
    os.close(fd)
    
    try:
        with open(temp_path, "wb") as f:
            f.write(file_stream.read())
            
        text = pytesseract.image_to_string(temp_path)

        buf = io.StringIO()
        buf.write(text)
        buf.seek(0)
        return buf
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        gc.collect()
