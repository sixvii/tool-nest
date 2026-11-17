from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, HttpUrl

from services.tasks import convert_url_to_pdf_task
from services.web_service import assert_public_url, UnsafeURLError
from routers._task_polling import poll_task_result

router = APIRouter(prefix="/api/convert/web", tags=["Web to PDF Conversions"])


class URLPayload(BaseModel):
    url: HttpUrl


@router.get("/task/{task_id}")
def get_task_status(task_id: str, background_tasks: BackgroundTasks):
    return poll_task_result(task_id, background_tasks)


@router.post("/url-to-pdf")
async def url_to_pdf(payload: URLPayload):
    # SSRF guard: HttpUrl only proves the URL is well-formed, not that its
    # target is safe. Reject internal/loopback/link-local/private hosts before
    # the browser ever fetches them.
    try:
        assert_public_url(str(payload.url))
    except UnsafeURLError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        task = convert_url_to_pdf_task.delay(url=str(payload.url))
        return JSONResponse(
            status_code=202,
            content={"success": True, "task_id": task.id, "message": "URL to PDF conversion has been started."},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start conversion task: {e}")
