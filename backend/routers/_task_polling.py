import os
from fastapi import BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from celery.result import AsyncResult

from celery_app import celery


def poll_task_result(task_id: str, background_tasks: BackgroundTasks, cleanup: bool = True):
    task_result = AsyncResult(task_id, app=celery)

    if task_result.failed():
        return JSONResponse(
            status_code=500,
            content={"status": "FAILURE", "error": "The task failed unexpectedly.", "detail": str(task_result.result)},
        )

    if not task_result.ready():
        content = {"status": task_result.status}
        if isinstance(task_result.info, dict):
            content["meta"] = task_result.info
        return JSONResponse(status_code=200, content=content)

    if task_result.successful():
        result = task_result.get()
        output_path = result.get("result_path")
        if not output_path or not os.path.exists(output_path):
            return JSONResponse(status_code=404, content={"status": "FAILURE", "error": "Result file not found on server."})

        if cleanup:
            def _cleanup(path: str):
                if path and os.path.exists(path):
                    os.remove(path)
            background_tasks.add_task(_cleanup, output_path)

        return FileResponse(
            output_path,
            media_type=result.get("content_type"),
            filename=result.get("filename"),
        )

    return JSONResponse(status_code=200, content={"status": task_result.status})
