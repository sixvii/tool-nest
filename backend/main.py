import os
import json
import uuid

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

import logging

# Redirect all unqualified tempfile output into one swept scratch dir. Imported
# for its side effect (sets tempfile.tempdir) — must run before any router/
# service creates a temp file. See services/scratch.py.
from services import scratch  # noqa: F401

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import (
    image_pdf_conversions, pdf, office_conversions, pdf_data_extraction,
    ebook_conversions, file_tools, web_conversions,
    audio_tools, structured_data_tools, image_tools, video_tools,
)

logging.getLogger("fontTools").setLevel(logging.ERROR)

app = FastAPI()

MB = 1024 * 1024
ROUTE_SIZE_LIMITS = {
    "/api/video": 500 * MB,
    "/api/file": 150 * MB,
    "/api/convert/data": 150 * MB,
    "/api/audio": 100 * MB,
    "/api/convert/office": 100 * MB,
    "/api/convert/ebook": 100 * MB,
    "/api/pdf": 50 * MB,
    "/api/convert/image-pdf": 50 * MB,
    "/api/image": 50 * MB,
}
DEFAULT_SIZE_LIMIT = 50 * MB


class LimitUploadSizeMiddleware:
    """ASGI middleware enforcing a per-path-prefix request-body size cap.

    The header-only predecessor trusted Content-Length, so a client that omitted
    it (chunked transfer) could stream an unbounded body straight to disk/memory.
    This keeps the fast up-front Content-Length reject AND counts the actual
    bytes as they arrive, rejecting with 413 the moment the cap is passed.
    Under-limit requests pass straight through with only a running byte count;
    the reject machinery only engages once a body goes over.
    """

    def __init__(self, app, size_limits: dict, default_limit: int):
        self.app = app
        self.size_limits = size_limits
        self.default_limit = default_limit

    def _limit_for(self, path: str) -> int:
        return next(
            (lim for prefix, lim in self.size_limits.items() if path.startswith(prefix)),
            self.default_limit,
        )

    async def _send_413(self, send, max_size: int):
        payload = json.dumps({
            "success": False,
            "error": "Payload Too Large",
            "message": f"Upload rejected. The maximum file size allowed for this specific tool is {max_size // MB}MB.",
        }).encode()
        await send({
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(payload)).encode()),
            ],
        })
        await send({"type": "http.response.body", "body": payload})

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_size = self._limit_for(scope["path"])

        # Fast path: honest clients declare Content-Length — reject before reading.
        for name, value in scope["headers"]:
            if name == b"content-length":
                try:
                    if int(value) > max_size:
                        await self._send_413(send, max_size)
                        return
                except ValueError:
                    pass
                break

        state = {"total": 0, "over": False, "sent413": False}

        async def rcv():
            if state["over"]:
                return {"type": "http.disconnect"}
            message = await receive()
            if message["type"] == "http.request":
                state["total"] += len(message.get("body", b""))
                if state["total"] > max_size:
                    state["over"] = True
            return message

        async def snd(message):
            # Once over the limit, swallow whatever the app tries to send and
            # emit our 413 exactly once in its place.
            if state["over"]:
                if not state["sent413"]:
                    state["sent413"] = True
                    await self._send_413(send, max_size)
                return
            await send(message)

        try:
            await self.app(scope, rcv, snd)
        except Exception:
            # A truncated body (we returned http.disconnect after the cap) makes
            # the body parser raise — that's expected; convert to our 413.
            if state["over"]:
                if not state["sent413"]:
                    state["sent413"] = True
                    await self._send_413(send, max_size)
                return
            raise

        if state["over"] and not state["sent413"]:
            state["sent413"] = True
            await self._send_413(send, max_size)


# CORS origins are env-driven so prod can be scoped to the real frontend origin
# without a code change (Production Analysis #13). ALLOWED_ORIGINS is a
# comma-separated list; unset or "*" keeps the current open default so existing
# deploys don't break. allow_credentials stays False — it is incompatible with
# a "*" origin and the API uses no cookies.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*").strip()
allowed_origins = (
    ["*"] if _origins_env == "*"
    else [o.strip() for o in _origins_env.split(",") if o.strip()]
)

# Order matters: add the size limiter first so CORS (added last) wraps it and
# still decorates the 413 with CORS headers for browser clients.
app.add_middleware(LimitUploadSizeMiddleware, size_limits=ROUTE_SIZE_LIMITS, default_limit=DEFAULT_SIZE_LIMIT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image_pdf_conversions.router)
app.include_router(pdf.router)
app.include_router(pdf_data_extraction.router)
app.include_router(ebook_conversions.router)
app.include_router(file_tools.router)
app.include_router(web_conversions.router)
app.include_router(audio_tools.router)
app.include_router(image_tools.image_router)
app.include_router(image_tools.convert_router)
app.include_router(structured_data_tools.router)

app.include_router(office_conversions.router)
app.include_router(video_tools.router)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Do NOT leak the raw exception text to the client — it can expose internal
    # paths, library internals, or fragments of the input. Log the full detail
    # (with traceback) server-side under a short correlation id, and hand the
    # client only that id so a report can be tied back to the log line.
    error_id = uuid.uuid4().hex[:12]
    logging.exception(f"[{error_id}] Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Quote the reference id if you report this.",
            "error_id": error_id,
            "path": request.url.path,
        }
    )

@app.get("/health")
def health_check():
    # Liveness only — is this process up. Static by design.
    return {"status": "ok"}


@app.get("/ready")
def readiness_check():
    # Readiness — can the system actually do work. celery.control.ping needs a
    # live broker AND at least one worker responding, so a single empty/failed
    # ping covers both "Redis down" and "no workers" in one check. Returns 503
    # when not ready so an orchestrator/LB can hold traffic off until it is.
    from celery_app import celery
    try:
        replies = celery.control.ping(timeout=1.0)
    except Exception:
        replies = []
    worker_count = len(replies) if replies else 0
    ready = worker_count > 0
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"ready": ready, "workers": worker_count},
    )

@app.get("/test-error")
def test_error():
    raise ValueError("This is a simulated backend crash to test the global handler.")
