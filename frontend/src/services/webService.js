import api from './api';
import { postWithPolling } from './taskPolling';

const POLL_URL = '/api/convert/web/task';

export async function urlToPdf(url, onProgress) {
  return postWithPolling(api, '/api/convert/web/url-to-pdf', { url }, {}, POLL_URL, onProgress);
}
