import api from './api';
import { postWithPolling } from './taskPolling';

const HEADERS = { headers: { 'Content-Type': undefined } };
const POLL_URL = '/api/convert/office/task';

export async function wordToPdf(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, '/api/convert/office/word-to-pdf', fd, HEADERS, POLL_URL, onProgress);
}

export async function pdfToWord(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, '/api/convert/office/pdf-to-word', fd, HEADERS, POLL_URL, onProgress);
}

export async function pptToPdf(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, '/api/convert/office/ppt-to-pdf', fd, HEADERS, POLL_URL, onProgress);
}

export async function pdfToPpt(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, '/api/convert/office/pdf-to-ppt', fd, HEADERS, POLL_URL, onProgress);
}

export async function msgToPdf(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, '/api/convert/office/msg-to-pdf', fd, HEADERS, POLL_URL, onProgress);
}

export async function emlToPdf(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, '/api/convert/office/eml-to-pdf', fd, HEADERS, POLL_URL, onProgress);
}
