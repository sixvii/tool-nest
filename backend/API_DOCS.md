# API Documentation

This document outlines the available REST API endpoints exposed by the Tool
Nest backend.

**Base URL:** `http://localhost:8000` (or your deployed domain)

For architecture background (why some endpoints work the way they do below,
how to add a new one, testing conventions) see `README.md` §7-9. This
document is the endpoint-by-endpoint reference; the README is the
"why"/"how to extend" reference.

---

## 0. Two response patterns used in this API

Every endpoint below is marked either **[SYNC]** or **[ASYNC]**. Knowing
which one you're calling changes how you handle the response.

### [SYNC] endpoints

Simple. `POST` the file, get the result back directly in the same response.

```
POST /api/some/endpoint  (multipart/form-data)
  -> 200 OK, body = the resulting file (or JSON, for a few text-output endpoints)
```

### [ASYNC] endpoints — the task pattern

Heavier conversions (LibreOffice, ffmpeg, Calibre, Ghostscript, Playwright,
OCR, AI model inference) run as background Celery jobs so the request thread
isn't blocked. **The URL is identical to what a synchronous version of the
same endpoint would be** — there is no separate `/api/async/...` prefix
anywhere in this API. What changes is the response:

```
POST /api/some/endpoint  (multipart/form-data)
  -> 202 Accepted
     { "success": true, "task_id": "abc-123", "message": "..." }

GET /api/some/task/{task_id}      <- note: same prefix as the POST endpoint
  -> while running:
     200 OK
     { "status": "PENDING" }
     or
     { "status": "PROGRESS", "meta": { "stage": "converting" } }

  -> once done:
     200 OK, body = the resulting file (Content-Type set appropriately)

  -> on failure:
     500
     { "status": "FAILURE", "error": "The task failed unexpectedly.", "detail": "..." }

  -> if the result file is somehow gone (e.g. cleaned up before you polled):
     404
     { "status": "FAILURE", "error": "Result file not found on server." }
```

**Stage names are not standardized across every task** — you'll see things
like `"converting"`, `"compressing"`, `"loading model"`, `"running OCR"`,
`"finalizing"`. Treat `meta.stage` as a human-readable label to display
("Converting...", "Finalizing...") rather than a fixed enum to switch on.

**Each router with async endpoints exposes its own `/task/{task_id}`** at
its own prefix (e.g. `/api/video/task/{id}`, `/api/convert/office/task/{id}`).
There is no single global polling endpoint — poll at the same prefix you
posted to.

**Frontend implementation:** the `services/taskPolling.js` helpers
(`postWithPolling` / `postWithPollingResponse`) handle this whole
dance — POST, detect `202 + task_id` vs. an immediate file, poll, resolve
with the final file. New frontend service functions should use these rather
than reimplementing the loop. They also degrade gracefully against a `[SYNC]`
endpoint (just returns the file directly), so it's safe to call them even if
you're not 100% sure an endpoint is async.

---

## 1. General & System Endpoints

### `GET /health` — [SYNC]

- **Description:** Health check.
- **Response:** `{"status": "ok"}`

### `GET /test-error` — [SYNC]

- **Description:** Diagnostic endpoint that deliberately raises an exception, to verify the global error handler.
- **Response (500):** `{"success": false, "error": "Internal Server Error", "message": "...", "path": "/test-error"}`

### Global error handling

Any unhandled exception anywhere in the API returns this shape:

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "<exception message>",
  "path": "<request path>"
}
```

### Upload size limits

Enforced by middleware based on URL prefix, checked against the
`Content-Length` header before the request is processed:

| Prefix                   | Max size        |
| ------------------------ | --------------- |
| `/api/video`             | 500 MB          |
| `/api/file`              | 150 MB          |
| `/api/convert/data`      | 150 MB          |
| `/api/audio`             | 100 MB          |
| `/api/convert/office`    | 100 MB          |
| `/api/convert/ebook`     | 100 MB          |
| `/api/pdf`               | 50 MB           |
| `/api/convert/image-pdf` | 50 MB           |
| `/api/image`             | 50 MB           |
| _(anything else)_        | 50 MB (default) |

Exceeding the limit returns `413`:

```json
{
  "success": false,
  "error": "Payload Too Large",
  "message": "Upload rejected. The maximum file size allowed for this specific tool is <N>MB."
}
```

---

## 2. Office Document Conversions — all [ASYNC]

**Base Prefix:** `/api/convert/office` · LibreOffice via `unoserver`

All accept `multipart/form-data` with a single `file` field. All follow the
task pattern in §0 — dispatch returns `202 + task_id`, poll
`GET /api/convert/office/task/{task_id}`.

| Endpoint            | Input          | Output  |
| ------------------- | -------------- | ------- |
| `POST /word-to-pdf` | `.docx` etc.   | `.pdf`  |
| `POST /pdf-to-word` | `.pdf`         | `.docx` |
| `POST /ppt-to-pdf`  | `.pptx` etc.   | `.pdf`  |
| `POST /pdf-to-ppt`  | `.pdf`         | `.pptx` |
| `POST /msg-to-pdf`  | Outlook `.msg` | `.pdf`  |
| `POST /eml-to-pdf`  | `.eml`         | `.pdf`  |

`GET /task/{task_id}` — poll endpoint, see §0.

---

## 3. Video Conversions & Manipulation — all [ASYNC]

**Base Prefix:** `/api/video` · ffmpeg

All accept `multipart/form-data`. All follow the task pattern in §0.
**One shared poll endpoint** (`GET /api/video/task/{task_id}`) handles both
the format-conversion and manipulation task types below.

### Format conversions

`file` field only, no extra params. Output format matches the endpoint name.

`POST /mov-to-mp4`, `/video-to-gif`, `/mp4-to-gif`, `/mov-to-gif`,
`/mkv-to-gif`, `/avi-to-gif`, `/gif-to-mov`, `/gif-to-webm`, `/gif-to-mp4`,
`/gif-to-apng`, `/video-to-webp`, `/mp4-to-avi`, `/avi-to-mp4`,
`/webm-to-mp4`, `/mp4-to-webm`, `/mkv-to-mp4`, `/mp4-to-mov`, `/mov-to-avi`,
`/mkv-to-avi`, `/webm-to-mov`, `/avi-to-mov`, `/mkv-to-mov`, `/avi-to-mkv`

### Manipulation endpoints

`POST /compress`

- `file`, `crf` (int, form, default `28`) — lower = better quality/larger file, 0-51.

`POST /trim`

- `file`, `start_time` (str, e.g. `"00:00:10"` or `"10"`), `end_time` (str). `end_time` must be > `start_time` or you'll get a `400`.

`POST /cut-edges`

- `file`, `front_cut` (float, seconds), `back_cut` (float, seconds). Negative values → `400`.

`POST /resize`

- `file`, `width` (int), `height` (int).

`POST /add-subtitles`

- `file` (video), `subtitle` (subtitle file, e.g. `.srt`) — two-file upload. Output is always `.mkv`.

`POST /mute`

- `file` only. Output format matches input.

`POST /compress-mov`, `POST /compress-avi`, `POST /compress-mkv`

- `file` only, format-specific compression presets.

`GET /task/{task_id}` — poll endpoint, see §0.

---

## 4. Ebook Conversions — all [ASYNC]

**Base Prefix:** `/api/convert/ebook` · Calibre

All accept `multipart/form-data` with a single `file` field.

`POST /epub-to-pdf`, `/pdf-to-epub`, `/mobi-to-pdf`, `/pdf-to-mobi`,
`/azw3-to-pdf`, `/pdf-to-azw3`

`GET /task/{task_id}` — poll endpoint, see §0.

---

## 5. Audio Conversion & Extraction — all [ASYNC]

**Base Prefix:** `/api/audio` · ffmpeg

`POST /extract-audio`

- `file`, `format` (form, default `"mp3"`) — target format: mp3/wav/ogg/flac/etc.

Fixed format-conversion endpoints (`file` field only):

`POST /mp4-to-mp3`, `/mov-to-mp3`, `/mkv-to-mp3`, `/webm-to-mp3`,
`/avi-to-mp3`, `/mp4-to-wav`, `/mov-to-wav`, `/m4a-to-mp3`, `/ogg-to-mp3`,
`/aac-to-mp3`, `/m4a-to-wav`, `/ogg-to-wav`, `/aac-to-wav`, `/aac-to-flac`,
`/aac-to-m4r`, `/m4a-to-mp4` (audio wrapped into an mp4 container),
`/mp4-to-ogg`, `/aac-to-mp4` (audio wrapped into an mp4 container)

`GET /task/{task_id}` — poll endpoint, see §0.

---

## 6. Web to PDF — [ASYNC]

**Base Prefix:** `/api/convert/web` · Playwright (headless Chromium)

### `POST /url-to-pdf`

- **Request Body:** `application/json` — `{"url": "https://example.com"}` (note: this is the one conversion endpoint in the whole API that takes JSON, not `multipart/form-data`, since there's no file to upload).
- **SSRF guard:** the URL's host is resolved and rejected if it points at a non-public address (loopback, private, link-local incl. cloud metadata `169.254.169.254`, reserved). Such a URL returns `400` with `{"detail": "... not allowed."}` — a well-formed URL alone is not enough, the target must be public.
- Dispatches to Celery, returns `202 + task_id` per §0.

`GET /task/{task_id}` — poll endpoint, see §0.

---

## 7. PDF Manipulation & Editing

**Base Prefix:** `/api/pdf` · mostly pikepdf/PyPDF2 (fast, in-memory) — **except `/compress`**, which is [ASYNC] (Ghostscript, can be slow on large files). Everything else on this router is [SYNC].

`GET /task/{task_id}` — poll endpoint for `/compress`, see §0.

### `POST /merge` — [SYNC]

- `files` (multiple `.pdf`) → merged `.pdf`

### `POST /split` — [SYNC]

- `file`, `page_ranges` (str, e.g. `"0-2, 4, 6-8"`, 0-indexed) → `.pdf`

### `POST /rotate` — [SYNC]

- `file`, `degrees` (int, e.g. 90/180/270), `page_ranges` (optional str; omit to rotate all pages) → `.pdf`

### `POST /rearrange` — [SYNC]

- `file`, `page_indices` (str, comma-separated, e.g. `"2,0,1"`) → `.pdf`

### `POST /delete-pages` — [SYNC]

- `file`, `pages` (str, comma-separated indices) → `.pdf`

### `POST /crop` — [SYNC]

- `file`, `x_percent`, `y_percent`, `width_percent`, `height_percent` (floats, 0-100) → `.pdf`

### `POST /resize` — [SYNC]

- `file`, `width`, `height` (floats, in points; 1/72 inch — e.g. 595×842 for A4) → `.pdf`

### `POST /compress` — **[ASYNC]**

- `file`, `compression_level` (int, form, default `4`): `0`=Default, `1`=Prepress, `2`=Printer, `3`=Ebook, `4`=Screen (lowest quality/highest compression)
- Dispatches to Celery, returns `202 + task_id` per §0. Poll `GET /api/pdf/task/{task_id}`.

### `POST /protect` — [SYNC]

- `file`, `password` (str) → password-protected `.pdf`

### `POST /unlock` — [SYNC]

- `file`, `password` (str) → unlocked `.pdf`

### `POST /watermark` — [SYNC]

- `file`, plus: `text` (optional str), `image` (optional file), `x`/`y` (floats), `font_size` (float, default 36.0), `color_hex` (default `"#808080"`), `opacity` (float, default 0.5), `rotation` (float), `page_from`/`page_to` (ints), `position` (optional str), `layer` (`"over"`/`"under"`), `mosaic` (bool)

### `POST /extract-images` — [SYNC]

- `file` → `.zip` of extracted images

### `POST /parse` — [SYNC]

- `file` → JSON of parsed PDF content (not a file download)

### `POST /edit` — [SYNC]

- Raw multipart form (not typed `File`/`Form` params): `file`, `elements` (JSON string describing edits), plus any `image_*`/`drawing_*`/`draw_*` keys as embedded asset files → edited `.pdf`

### `POST /replace-text` — [SYNC]

- `file`, `search_text`, `replace_text`, `mode` (`"all"` or `"single"`, default `"all"`), `match_index` (int, only used when `mode="single"`) → `.pdf`

### `POST /esign` — [SYNC]

- `file`, `signature_type` (`"certificate"`/`"text"`/`"image"`/`"draw"`, default `"certificate"`), plus depending on type: `signature_text`, `signature_image` (file), `signature_font`, `font_size` (default 24), `page` (1-indexed, default 1), `certificate` (file), `password`, `x`/`y` (floats 0.0-1.0) → signed `.pdf`

---

## 8. Image ⇄ PDF Cross-Conversions

**Base Prefix:** `/api/convert/image-pdf` — `pdf-to-jpg`/`pdf-to-png`/`pdf-to-tiff` are [ASYNC] (poppler, slow on multi-page PDFs); everything else on this router is [SYNC].

`GET /task/{task_id}` — poll endpoint for the 3 async endpoints below, see §0.

### `POST /images-to-pdf` — [SYNC]

- `files` (multiple images) → single compiled `.pdf`

### `POST /pdf-to-jpg` — **[ASYNC]**

### `POST /pdf-to-png` — **[ASYNC]**

### `POST /pdf-to-tiff` — **[ASYNC]**

- `file` (`.pdf`). Dispatches to Celery, `202 + task_id` per §0.
- Final result: single-page PDFs return one image; multi-page PDFs return a `.zip`. Content-Type is `image/jpeg`, `image/png`, `image/tiff`, or `application/zip` accordingly — check the poll response's `Content-Type` header to tell which you got.

### `POST /heic-to-pdf` — [SYNC]

- `files` (multiple `.heic`) → single compiled `.pdf`

### `POST /eps-to-pdf` — [SYNC]

- `files` (multiple `.eps`, via Ghostscript) → single compiled `.pdf`

---

## 9. Image Tools

Two separate routers/prefixes in the same file (`image_tools.py`) — **each
has its own `/task/{id}` poll endpoint**, they are separate URL namespaces.

### 9a. `/api/image` — general image tools

Mostly [SYNC] (Pillow, in-memory). **Exception: background removal / blur /
add-text are [ASYNC]** — these run a real ML model (background removal),
which is slow enough to warrant the task pattern.

`GET /api/image/task/{task_id}` — poll endpoint for the async ones below, see §0.

**[SYNC]:**

- `POST /resize` — `file`, `width` (int), `height` (int)
- `POST /black-and-white` — `file`
- `POST /add-border` — `file`, `border_width` (int, default 10), `color_hex` (default `"black"`), `style` (default `"solid"`)
- `POST /pixelate` — `file`, `pixel_size` (int, default 10)
- `POST /flip` — `file`, `direction` (`"horizontal"`/`"vertical"`, default `"horizontal"`)
- `POST /view-metadata` — `file` → JSON of image metadata (not a file download)
- `POST /remove-metadata` — `file` → cleaned image file
- `POST /profile-photo-maker` — `file`, `bg_color` (optional str)
- `POST /split-image` — `file`, `grid_rows` (int, default 2), `grid_cols` (int, default 2) → `.zip` of tiles
- `POST /compress` — `file`, `quality` (int, 1-100, required) → `.jpg`
- `POST /crop` — `file`, `x`, `y`, `width`, `height` (ints)
- `POST /round` — `file` → `.png` with rounded corners
- `POST /combine-images` (alias: `POST /collage-maker`) — `files` (multiple), `layout_type` (default `"grid"`) → single `.jpg`
- `POST /font-awesome-to-png` — `icon_unicode`, `size` (int), `color` (str, all form fields, no file) → `.png`

**[ASYNC]:**

- `POST /blur-background` — `file`, `radius` (int, default 15)
- `POST /remove-background` — `file` (cuts out the subject, transparent elsewhere)
- `POST /transparent-background` — `file` (variant of the above)
- `POST /add-text` — `file`, `text`, `x` (int), `y` (int), `font_size` (int, default 24), `color` (default `"black"`), `font_family` (str, default `"Arial"` — one of the names in `services/image_tools_service.py`'s `FONT_MAP`; unrecognized names silently fall back to Arial), `rotation` (float, default 0.0)

### 9b. `/api/convert/image` — format conversions

All [SYNC].

`GET /api/convert/image/task/{task_id}` exists on this router too but
currently has nothing to poll — no endpoint under this prefix dispatches a
task. (EPS/ImageMagick conversions here look similarly "heavy" but are
plain fast subprocess calls, deliberately kept synchronous — see README §7.)

- `POST /webp-to-jpg`, `/png-to-jpg` — `file` → `.jpg`
- `POST /webp-to-png`, `/jpg-to-png` — `file` → `.png`
- `POST /jpg-to-webp` — `file` → `.webp`
- `POST /tiff-to-jpg`, `/tiff-to-png` — `file` → single image or `.zip` for multi-page TIFFs (check response Content-Type)
- `POST /jpg-to-avif`, `/png-to-avif`, `/webp-to-avif`, `/gif-to-avif` — `file` → `.avif`
- `POST /jpg-to-gif`, `/png-to-gif`, `/webp-to-gif` — `files` (multiple, combined into one animated GIF) → `.gif`
- `POST /gif-to-jpg`, `/gif-to-png` — `file` → single frame or `.zip` of all frames (check response Content-Type)
- `POST /png-to-eps` — `file` → `.eps` (ImageMagick)
- `POST /eps-to-png` — `file` → `.png` (ImageMagick, 300 DPI)
- `POST /eps-to-jpg` — `file` → `.jpg` (ImageMagick, 300 DPI)
- `POST /eps-to-svg` — `file` → `.svg` (ImageMagick)
- `POST /png-to-tiff`, `/jpg-to-tiff` — `file` → `.tiff`

---

## 10. PDF Text & Tabular Data Extraction — all [SYNC]

**Base Prefix:** `/api/convert/pdf-data`

All accept `multipart/form-data` with a single `file` field.

- `POST /pdf-to-text` → `.txt`
- `POST /pdf-to-csv` → `.csv`, or `.zip` if the PDF has multiple tables (check response Content-Type)
- `POST /pdf-to-excel` → `.xlsx`

---

## 11. CSV / Excel File Tools — all [SYNC]

**Base Prefix:** `/api/file`

- `POST /csv-to-excel` — `file` (`.csv`) → `.xlsx`
- `POST /excel-to-csv` — `file` (`.xlsx`) → `.csv`, or `.zip` if multiple sheets (check response Content-Type)
- `POST /split-csv` — `file`, `rows_per_file` (int, required, must be > 0) → `.zip` of split files
- `POST /split-excel` — `file`, `rows_per_file` (int, required, must be > 0) → `.zip` of split sheet files

---

## 12. Structured Data Conversions (CSV/JSON/XML)

**Base Prefix:** `/api/convert/data` — all [SYNC] **except `image-to-text`/`tiff-to-text`, which are [ASYNC]** (Tesseract OCR — `tiff-to-text` loops OCR per page, can be slow on multi-page TIFFs).

`GET /task/{task_id}` — poll endpoint for the 2 OCR endpoints below, see §0.

**[SYNC]:**

- `POST /json-to-xml` — `file` (`.json`) → `.xml`
- `POST /csv-to-xml` — `file` (`.csv`) → `.xml`
- `POST /xml-to-json` — `file` (`.xml`) → `.json`
- `POST /csv-to-json` — `file` (`.csv`) → `.json`
- `POST /json-to-csv` — `file` (`.json`, must be a top-level array of flat objects) → `.csv`
- `POST /xml-to-excel` — `file` (`.xml`) → `.xlsx`
- `POST /xml-to-csv` — `file` (`.xml`) → `.csv`
- `POST /excel-to-xml` — `file` (`.xlsx`) → `.xml`

**[ASYNC]:**

- `POST /image-to-text` — `file` (image) → `.txt`
- `POST /tiff-to-text` — `file` (multi-page TIFF) → `.txt`

---
