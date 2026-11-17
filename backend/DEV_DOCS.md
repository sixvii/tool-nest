# tool-nest backend — Developer README

This is the reference doc for anyone (human or AI) picking up this codebase.
It covers setup/running (the "how do I get this working" side) and
architecture/conventions (the "why does the code look like this, and how do
I add to it without breaking the pattern" side). Read the architecture
section before touching `routers/` or `services/tasks.py` — the whole
codebase follows one consistent pattern, and deviating from it in one file
is the most common source of bugs here.

---

## 1. What this system is

A FastAPI backend exposing document/media conversion tools — Word/PPT/PDF,
EML/MSG, ebooks, audio, video, images, web-to-PDF, and structured data
(CSV/JSON/XML). Heavier conversions run as background jobs via Celery +
Redis so a slow LibreOffice/ffmpeg/rembg call doesn't block the request
thread. LibreOffice conversions go through `unoserver` (a long-lived
LibreOffice process) instead of spawning `libreoffice --headless` per
request, for speed.

Paired with a frontend (separate repo/directory) whose `services/*.js`
files know how to dispatch a task and poll for the result.

---

## 2. Prerequisites

Several conversion features rely on system-level binaries, not just Python
packages. Install these before running the backend natively:

| Tool | Needed for |
|---|---|
| **LibreOffice** | Office document conversions |
| **unoserver** | Bridges LibreOffice for fast conversions (installed via `requirements.txt`, but the daemon itself needs to be running — see §4) |
| **Poppler** | PDF → image conversion |
| **Ghostscript** | EPS → PDF, PDF compression |
| **msgconvert** | MSG → PDF (part of `Email-Outlook-Message` perl package; availability varies by OS) |
| **Java (JRE)** | `tabula-py` PDF table extraction |
| **FFmpeg** | All video conversion/manipulation endpoints |
| **Calibre** | All ebook conversion endpoints (EPUB/MOBI/AZW3) |
| **Playwright** | Web/HTML → PDF |
| **Tesseract OCR** | Image/TIFF → text |
| **ImageMagick** | EPS → PNG/JPG/SVG |

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install libreoffice poppler-utils ghostscript libemail-outlook-message-perl default-jre ffmpeg calibre tesseract-ocr imagemagick
```

**macOS (Homebrew):**
```bash
brew install libreoffice poppler ghostscript
```
(add the rest — `ffmpeg`, `calibre`, `tesseract`, `imagemagick` — the same way)

You'll also need **Redis** running locally (broker + result backend for
Celery) — not listed above since it's typically run via Docker or a system
package rather than these conversion-tool packages.

---

## 3. Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## 4. Running everything locally

You need **three** things running at once for the full system to work:
Redis, the Celery worker, and uvicorn. Missing the worker is the most
common "why isn't my upload doing anything" issue — the API will happily
accept the upload and return a `task_id`, but nothing will ever process it
without a worker running.

**Redis** (however you run it locally — `redis-server`, Docker, etc.)

**Celery worker** (from `/backend`, venv activated):
```bash
celery -A celery_app.celery worker --loglevel=info
```

**unoserver** (only needed outside Docker — inside Docker it's its own
container). Without it, office conversions fall back to spawning
`libreoffice` directly per request (slower, but this fallback is
intentional, not a bug):
```bash
unoserver --interface 127.0.0.1 --port 2003
```

**API server:**
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Gotchas that will cost you an hour if you don't know them

- **`services/tasks.py` changes need a Celery worker restart.** Celery does
  not hot-reload like uvicorn's `--reload` does. `Received unregistered
  task of type '...'` means you edited `tasks.py` but forgot to restart the
  worker.
- **`ImportError: cannot import name 'X' from 'services.tasks'`** almost
  always means the function you're trying to import genuinely isn't in the
  file yet — not a caching issue. Check with
  `grep -n "def X" services/tasks.py`. If it prints nothing, the edit
  didn't land (wrong file, wrong indentation level, or it just never got
  pasted in). Also worth clearing stale bytecode if in doubt:
  `find . -name "__pycache__" -type d -exec rm -rf {} +`.
- **A function pasted into the wrong file** (e.g. a `@celery.task` decorator
  ending up in `image_tools_service.py` instead of `tasks.py`) will fail
  with `NameError: name 'celery' is not defined` — that's the tell that
  something Celery-specific landed in a file that's supposed to be pure
  synchronous logic with no Celery import at all.
- **Run as `python -m ...` in venvs**, not the bare command, to avoid
  picking up a different install:
  ```bash
  python -m celery -A celery_app.celery worker --loglevel=info
  python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Dependencies landing in `~/.local` instead of `.venv`** is a classic
  silent-failure mode. Check with `pip show fastapi` and confirm
  `Location:` points inside `.venv/lib/...`.

---

## 5. Testing

```bash
pytest --cov=routers --cov=services --cov-report=term-missing --cov-fail-under=80
```

See §8 below for how tests are structured for the Celery-backed parts of
the codebase specifically — the mocking approach is not obvious if you
haven't seen the pattern before, and copying a naive "just mock the service
call" approach from an older test will not work correctly here.

---

## 6. API Documentation

Interactive Swagger UI: **http://127.0.0.1:8000/docs**

`API_DOCS.md` in this repo is the detailed endpoint-by-endpoint reference and
is **current** (updated 2026-07-21): it marks every endpoint `[SYNC]` or
`[ASYNC]` and documents the `202 + task_id` → poll shape for the async ones.
The Swagger UI is auto-generated from the code and is the ultimate source of
truth if the two ever disagree.

---

## 7. Architecture: the async task pattern

This is the single most important thing to understand about this codebase.

### The rule: no new URL paths for async support

When an endpoint is converted from synchronous to background-job-backed, it
**keeps its exact URL**. There is no `/api/async/...` prefix anywhere. The
pattern:

1. The endpoint saves the uploaded file to `/tmp/tool-nest-uploads`.
2. It calls `some_task.delay(...)` and returns **`202 Accepted`** with
   `{"success": true, "task_id": "...", "message": "..."}` — same URL as
   before, but the response shape changed from "file bytes" to "a task id
   to poll."
3. The same router exposes `GET {its-own-prefix}/task/{task_id}` for
   polling. Once done, this returns the actual file (`FileResponse`), not
   another layer of JSON.
4. `routers/_task_polling.py`'s `poll_task_result()` does the actual
   `AsyncResult`-checking/`FileResponse` logic — routers just call it, they
   don't reimplement polling.

**If a router file has more than one `APIRouter` instance under different
prefixes** (e.g. `image_tools.py`'s `image_router` at `/api/image` vs.
`convert_router` at `/api/convert/image`), **each prefix that dispatches
tasks needs its own `/task/{id}` poll endpoint** — they're separate URL
namespaces even though they're defined in the same Python file.

### Stage-based progress, not percentages

Celery's built-in states (`PENDING`/`STARTED`/`SUCCESS`/`FAILURE`) carry no
progress detail. Every task calls a shared helper at least twice:

```python
def _set_stage(task, stage: str):
    task.update_state(state='PROGRESS', meta={'stage': stage})
```

— once when real work starts (`"converting"`, `"compressing"`, `"loading
model"`, `"running OCR"`, ...) and again right before finalizing
(`"finalizing"`). `poll_task_result` forwards this, so a pending poll
returns `{"status": "PROGRESS", "meta": {"stage": "converting"}}` instead of
a bare status string.

This is **intentionally coarse, not numeric**. Most underlying tools
(LibreOffice/unoserver, Calibre, rembg) are a single blocking call with no
intermediate signal. FFmpeg is the one tool here that *could* expose real
percentage progress (it emits time/frame info to stderr) — not implemented,
would require actually parsing that stderr stream.

### Which modules are converted (as of this writing)

| Router | Prefix | Task(s) in `services/tasks.py` |
|---|---|---|
| `office_conversions.py` | `/api/convert/office` | `convert_office_document` (generic, dispatches via the `_OPERATIONS` dict) |
| `video_tools.py` | `/api/video` | `convert_video_task` (simple format conversions) + `process_video_task` (manipulations, via `_VIDEO_OPERATIONS` dict) — one shared `/api/video/task/{id}` poll endpoint for both |
| `ebook_conversions.py` | `/api/convert/ebook` | `convert_ebook_task` |
| `audio_tools.py` | `/api/audio` | `convert_audio_task` |
| `web_conversions.py` | `/api/convert/web` | `convert_url_to_pdf_task` (Playwright, wrapped in `asyncio.run()` since Celery tasks are sync) |
| `pdf.py` (compress only) | `/api/pdf` | `compress_pdf_task` — rest of `pdf.py` is synchronous |
| `image_pdf_conversions.py` (pdf-to-jpg/png/tiff only) | `/api/convert/image-pdf` | `convert_pdf_to_images_task` — rest (`images-to-pdf`, `heic-to-pdf`, `eps-to-pdf`) is synchronous |
| `structured_data_tools.py` (image-to-text/tiff-to-text only) | `/api/convert/data` | `ocr_task` — csv/json/xml conversions are synchronous |
| `image_tools.py` (`/api/image` prefix: remove/transparent/blur-background, add-text) | `/api/image` | `remove_background_task` (mode discriminates remove/transparent/blur), `add_text_to_image_task` |

**Deliberately left synchronous:** everything in `image_tools.py`'s
`/api/convert/image` prefix (including **EPS/ImageMagick conversions** —
these are plain subprocess calls, not model inference, and are fast enough
to stay inline), all of `pdf_data_extraction.py` and `file_tools.py`, and
the non-OCR parts of `structured_data_tools.py`. The dividing line is
roughly: does this call a real ML model, a subprocess with meaningful
runtime (LibreOffice, Calibre, ffmpeg, Ghostscript on a large file), or an
external browser (Playwright)? If yes, it's async. If it's in-memory
Pillow/pikepdf/pandas work, it stays synchronous — converting those would
add latency for no benefit.

**Don't assume a given endpoint is converted just because a similar one
is.** EPS conversions and background-removal both live in `image_tools.py`
and both sound "heavy," but only background-removal (real model inference)
is Celery-backed — EPS conversions (ImageMagick subprocess) are not. Check
the actual router code, not intuition, before writing tests or frontend
code against an endpoint.

### How to convert a new endpoint to this pattern

1. **In `services/tasks.py`:** write a `@celery.task(bind=True)` function
   that does the real work and returns
   `{"status": "SUCCESS", "result_path": ..., "filename": ..., "content_type": ...}`.
   Call `_set_stage(self, "...")` before work starts and again before
   finalizing. Clean up the input file in a `finally:` block. Catch
   exceptions, call `self.update_state(state='FAILURE', meta={'exc_type':
   type(e).__name__, 'exc_message': str(e)})`, then re-raise. (Match this
   exact `meta` shape — one existing task uses `{"error": str(e)}` instead
   and it's an inconsistency, not something to copy.)
2. **In the router:** replace the synchronous handler body with: save
   upload → call `your_task.delay(...)` inside a `try/except` → return
   `JSONResponse(status_code=202, content={"success": True, "task_id": task.id, "message": "..."})`.
   On dispatch failure, clean up the saved upload and raise
   `HTTPException(500, ...)` — don't let an unhandled exception escape
   here, it bypasses the app's exception-handling middleware in a way that
   produces an ugly crash instead of a clean 500 (this has actually
   happened — see `image_pdf_conversions.py` history).
3. **Add a `/task/{task_id}` GET endpoint** on that same router/prefix that
   just calls `poll_task_result(task_id, background_tasks)`.
4. **Do not** create a new router file or new URL prefix for this.
5. Restart the Celery worker and test with a real file.
6. **Update the frontend** — see §9. The service-layer function for this
   endpoint needs to switch from a plain POST to `postWithPolling(...)`.

---

## 8. Testing conventions for the Celery-backed code

Two different things get tested differently — mixing them up produces
tests that pass locally but don't actually exercise the real code path.

### Testing a router's dispatch (does it call `.delay()` correctly?)

Mock the task at the router's import location and assert `202 + task_id`:

```python
@patch('routers.video_tools.convert_video_task')
def test_dispatches_task(mock_task, ...):
    mock_task.delay.return_value = MagicMock(id="fake-task-id")
    response = client.post(endpoint, files=files)
    assert response.status_code == 202
    assert response.json()["task_id"] == "fake-task-id"
```

### Testing the poll endpoint (does `/task/{id}` delegate correctly?)

Mock `routers._task_polling.AsyncResult`. Deep coverage of every
state transition (pending/progress-with-stage/success/failure/missing-file)
lives once in `tests/test_task_polling.py`, since every router delegates to
the same `poll_task_result` function — don't re-test every state per
router, just prove each router's poll route is wired up (one success-case
test per router is enough).

### Testing a task's actual body (does the real logic work?)

Call the task function **directly**, not via `.delay()` — for a `bind=True`
task this still runs the real function with `self` correctly bound, no
broker needed:

```python
result = tasks.convert_video_task(input_path=in_path, output_ext="mp4")
```

**The one thing you must mock:** `self.update_state()`, since both
`_set_stage()` and every `except` block call it, and it'll try to reach a
real Redis result backend otherwise (you'll see `Connection to Redis lost:
Retry...` errors if you forget this):

```python
@patch.object(tasks.convert_video_task, 'update_state')
@patch('services.tasks.video_service')
def test_convert_video_task_success(mock_video_service, mock_update_state, tmp_path):
    ...
```

**Watch for dict-based dispatch.** `convert_office_document` and
`process_video_task` don't call `office_service.X(...)` / `video_service.X(...)`
directly — they look up the function to call from `_OPERATIONS` /
`_VIDEO_OPERATIONS`, dicts built **at import time** holding direct function
references. `@patch('services.tasks.office_service')` after import has *no
effect* on those dicts — you have to patch the dict entries themselves:

```python
with patch.dict(tasks._OPERATIONS, {"word-to-pdf": (mock_fn, "application/pdf")}):
    result = tasks.convert_office_document(operation="word-to-pdf", ...)
```

Every other task calls its service module as `module.function(...)` at
runtime, so the normal `@patch('services.tasks.<module>')` works fine for
those.

`tests/task_test_utils.py` has a `FakeAsyncResult` helper
(`pending_result()`, `success_result()`, `failure_result()`) for the poll
tests described above.

---

## 9. Frontend: the matching polling pattern

Each frontend `services/*.js` file mirrors one router. For any endpoint
that's Celery-backed on the backend, the frontend function must:

1. **Not** set `responseType: 'blob'` expecting an immediate file — the
   response is JSON (`{success, task_id, message}`).
2. **Poll** `GET {prefix}/task/{task_id}` until the file comes back. The
   poll endpoint returns two different content-types depending on state —
   JSON while pending/failed, real file bytes once done — so the trick is
   to always request `responseType: 'blob'` and inspect the actual
   response `Content-Type` header to decide whether to `.text()` +
   `JSON.parse()` it or return it directly.
3. Optionally accept an `onProgress(stage)` callback, called whenever a
   poll response includes `meta.stage`.

This is centralized in `services/taskPolling.js`
(`postWithPolling`/`pollTask`, plus header-preserving variants
`postWithPollingResponse`/`pollTaskResponse` for cases like
`convertImageFormat` that need to inspect the final `Content-Type` to tell
a zip result from a single-file result). New service functions should call
these rather than reimplementing the poll loop — and the helper degrades
gracefully (just returns the file) if pointed at an endpoint that turns out
not to be converted yet, so it's safe to use even when you're not 100% sure
of an endpoint's current status.

---

