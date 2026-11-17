import api from './api';
import { postWithPolling } from './taskPolling';

const BLOB = { responseType: 'blob', headers: { 'Content-Type': undefined } };
const HEADERS = { headers: { 'Content-Type': undefined } };

const POLL_URL = '/api/convert/image-pdf/task';

export async function imagesToPdf(files) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const { data } = await api.post('/api/convert/image-pdf/images-to-pdf', fd, BLOB);
  return data;
}

export async function pdfToJpg(files, onProgress) {
  const fd = new FormData();
  const fileToSend = Array.isArray(files) ? files[0] : files;
  fd.append('file', fileToSend);
  return postWithPolling(
    api,
    '/api/convert/image-pdf/pdf-to-jpg',
    fd,
    HEADERS,
    POLL_URL,
    onProgress
  );
}

export async function pdfToPng(files, onProgress) {
  const fd = new FormData();
  const fileToSend = Array.isArray(files) ? files[0] : files;
  fd.append('file', fileToSend);
  return postWithPolling(
    api,
    '/api/convert/image-pdf/pdf-to-png',
    fd,
    HEADERS,
    POLL_URL,
    onProgress
  );
}

export async function pdfToTiff(files, onProgress) {
  const fd = new FormData();
  const fileToSend = Array.isArray(files) ? files[0] : files;
  fd.append('file', fileToSend);
  return postWithPolling(
    api,
    '/api/convert/image-pdf/pdf-to-tiff',
    fd,
    HEADERS,
    POLL_URL,
    onProgress
  );
}

export async function heicToPdf(files) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const { data } = await api.post('/api/convert/image-pdf/heic-to-pdf', fd, BLOB);
  return data;
}

export async function epsToPdf(files) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const { data } = await api.post('/api/convert/image-pdf/eps-to-pdf', fd, BLOB);
  return data;
}
