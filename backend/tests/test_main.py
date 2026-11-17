from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app, raise_server_exceptions=False)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("celery_app.celery.control.ping")
def test_ready_returns_200_when_a_worker_responds(mock_ping):
    mock_ping.return_value = [{"celery@host": {"ok": "pong"}}]
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"ready": True, "workers": 1}

@patch("celery_app.celery.control.ping")
def test_ready_returns_503_when_no_workers(mock_ping):
    mock_ping.return_value = []
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["ready"] is False

@patch("celery_app.celery.control.ping", side_effect=Exception("broker down"))
def test_ready_returns_503_when_broker_unreachable(mock_ping):
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["ready"] is False

def test_global_exception_handler():
    response = client.get("/test-error")
    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "Internal Server Error"
    # The raw exception text must NOT leak to the client (info disclosure) —
    # only a generic message plus a correlation id tied to the server-side log.
    assert "simulated backend crash" not in data["message"]
    assert data["error_id"]
    assert data["path"] == "/test-error"

def test_limit_upload_size():
    response = client.post(
        "/api/video/mov-to-mp4",
        headers={"content-length": str(1000 * 1024 * 1024)} # 1000 MB, limit is 500 MB
    )
    assert response.status_code == 413
    assert "Payload Too Large" in response.json()["error"]


def _drive_size_middleware(path, chunk_count, chunk_size=1024 * 1024):
    """Drive LimitUploadSizeMiddleware directly with a chunked body carrying NO
    content-length (the hole the header-only check left open). Returns the list
    of response-start statuses the middleware/app emitted."""
    import asyncio
    from main import LimitUploadSizeMiddleware, ROUTE_SIZE_LIMITS, DEFAULT_SIZE_LIMIT

    async def app(scope, receive, send):
        while True:  # a real upload endpoint drains the body
            m = await receive()
            if m["type"] == "http.disconnect":
                break
            if m["type"] == "http.request" and not m.get("more_body"):
                break
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})

    mw = LimitUploadSizeMiddleware(app, ROUTE_SIZE_LIMITS, DEFAULT_SIZE_LIMIT)
    chunks = [b"x" * chunk_size for _ in range(chunk_count)]
    idx = 0

    async def receive():
        nonlocal idx
        if idx < len(chunks):
            body = chunks[idx]
            idx += 1
            return {"type": "http.request", "body": body, "more_body": idx < len(chunks)}
        return {"type": "http.request", "body": b"", "more_body": False}

    statuses = []

    async def send(m):
        if m["type"] == "http.response.start":
            statuses.append(m["status"])

    asyncio.run(mw({"type": "http", "path": path, "headers": []}, receive, send))
    return statuses


def test_streamed_body_over_limit_rejected():
    # /api/pdf cap is 50MB; a 60MB chunked body (no content-length) -> 413
    assert _drive_size_middleware("/api/pdf/compress", 60) == [413]


def test_streamed_body_under_limit_passes_through():
    # 5MB is well under the cap -> app's own 200 is returned untouched
    assert _drive_size_middleware("/api/pdf/compress", 5) == [200]