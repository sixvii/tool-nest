import { toastError } from '../utils/toastUtils';

const DEFAULT_POLL_INTERVAL_MS = 1500;

async function toJson(blob) {
  const text = await blob.text();
  return JSON.parse(text);
}

export async function pollTask(
  apiInstance,
  pollUrl,
  taskId,
  onProgress,
  intervalMs = DEFAULT_POLL_INTERVAL_MS
) {
  const res = await pollTaskResponse(apiInstance, pollUrl, taskId, onProgress, intervalMs);
  return res.data;
}

export async function pollTaskResponse(
  apiInstance,
  pollUrl,
  taskId,
  onProgress,
  intervalMs = DEFAULT_POLL_INTERVAL_MS
) {
  const url = `${pollUrl}/${taskId}`;
  while (true) {
    const res = await apiInstance.get(url, { responseType: 'blob' });
    const contentType = res.headers?.['content-type'] || '';

    if (contentType.includes('application/json')) {
      const json = await toJson(res.data);

      if (json.status === 'FAILURE') {
        const message = json.error || 'Task failed';
        toastError(message);
        const err = new Error(message);
        err.isTaskFailure = true;
        throw err;
      }

      if (json.meta?.stage && onProgress) {
        onProgress(json.meta.stage);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      continue;
    }

    return res;
  }
}

export async function postWithPolling(apiInstance, url, payload, config, pollUrl, onProgress) {
  const response = await postWithPollingResponse(
    apiInstance,
    url,
    payload,
    config,
    pollUrl,
    onProgress
  );
  return response.data;
}

export async function postWithPollingResponse(
  apiInstance,
  url,
  payload,
  config,
  pollUrl,
  onProgress
) {
  const response = await apiInstance.post(url, payload, { ...config, responseType: 'blob' });
  const contentType = response.headers?.['content-type'] || '';

  if (contentType.includes('application/json')) {
    const json = await toJson(response.data);

    if (json.task_id) {
      return pollTaskResponse(apiInstance, pollUrl, json.task_id, onProgress);
    }

    return { data: json, headers: response.headers };
  }

  return response;
}
