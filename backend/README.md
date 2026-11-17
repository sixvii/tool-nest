## System Prerequisites

Several conversion features rely on system-level binaries. Before running the backend, ensure your operating system has the following packages installed:

- **LibreOffice:** Required for Office document conversions.
- **unoserver:** Python daemon required to bridge LibreOffice for fast document conversions (installed via `requirements.txt`).
- **Poppler:** Required for PDF to Image conversion.
- **Ghostscript:** Required for EPS to PDF conversion.
- **msgconvert:** Required for MSG to PDF conversion (part of `Email-Outlook-Message` perl script, availability varies by OS).
- **Java (JRE):** Required for `tabula-py` to extract tables from PDFs.
- **FFmpeg:** Required for all Video Format Conversion endpoints.
- **Calibre:** Required for all Ebook Format Conversion endpoints (e.g. EPUB, MOBI, AZW3).
- **Playwright:** Required for Web/HTML to PDF/Image conversions.
- **Tesseract OCR:** Required for image to text (OCR) conversions.
- **ImageMagick:** Required for EPS to PNG/JPG/SVG image conversions.

### Ubuntu/Debian Installation

```bash
sudo apt-get update
sudo apt-get install libreoffice poppler-utils ghostscript libemail-outlook-message-perl default-jre ffmpeg calibre tesseract-ocr imagemagick
```

### MacOS Installation (using Homebrew)

```bash
brew install libreoffice poppler ghostscript
```

## Setup & Installation

1. **Navigate to the backend directory:**

```bash
cd /home/murtaza/Projects/tool-nest/backend
```

2. **Create and activate a virtual environment (Recommended):**

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

3. **Install Python dependencies:**

```bash
pip install -r requirements.txt
```

## Running the Server Locally

To start the server natively without any external tunnels, use `uvicorn`:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- `--host 127.0.0.1`: Binds the server to localhost (accessible from your machine).
- `--port 8000`: Runs the application on port 8000.
- `--reload`: Automatically restarts the server when code changes are detected.

## Running the Celery Workers

To process background tasks, you need Celery worker(s) running. Make sure
your virtual environment is activated and Redis is running.

Tasks are split across two queues (see `celery_app.py`'s `task_routes`):

- **`office`** — office document conversions (word/ppt/pdf via unoserver).
  Kept at low concurrency since unoserver is a single LibreOffice process;
  more concurrency here wouldn't speed anything up.
- **`default`** — everything else (video, audio, ebook, web-to-pdf, pdf
  compress, pdf-to-image, OCR, AI background removal, and the periodic
  cleanup task). No shared bottleneck, so this can run higher concurrency.

**For local dev**, the simplest option is one worker listening to both
queues:

```bash
celery -A celery_app.celery worker --loglevel=info -Q office,default -c 2
```

**To mirror production's split** (see `docker-compose.yml`), run two
separate worker processes instead:

```bash
# terminal A
celery -A celery_app.celery worker --loglevel=info -Q office -c 2 -n office@%h

# terminal B
celery -A celery_app.celery worker --loglevel=info -Q default -c 4 -n default@%h
```

If you add a new `@celery.task` and don't explicitly route it in
`celery_app.py`'s `task_routes`, it lands on the `default` queue
automatically (`task_default_queue = "default"`) — only office tasks need
an explicit route.

**To run the periodic cleanup task** (`cleanup_stale_files`, see
`services/tasks.py`), you also need Celery Beat running — it schedules the
task but doesn't execute it itself, so you still need a worker listening to
the `default` queue for it to actually run:

```bash
celery -A celery_app.celery beat --loglevel=info
```

## Testing

To run the test suite and generate a coverage report, use the following command:

```bash
pytest --cov=routers --cov=services --cov-report=term-missing --cov-fail-under=80
```

## API Documentation

Once the server is running, you can explore and interactively test the endpoints using the automatically generated Swagger UI at **http://127.0.0.1:8000/docs**.

For a detailed breakdown of all endpoint routes, expected parameters, and responses, please refer to the **`API_DOCS.md`** file included in this repository.
