import api from './api';
import { postWithPolling } from './taskPolling';

const HEADERS = { headers: { 'Content-Type': undefined } };
const POLL_URL = '/api/convert/ebook/task';

const convert = async (endpoint, file, onProgress) => {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(api, endpoint, fd, HEADERS, POLL_URL, onProgress);
};

export const epubToPdf = (file, onProgress) =>
  convert('/api/convert/ebook/epub-to-pdf', file, onProgress);
export const pdfToEpub = (file, onProgress) =>
  convert('/api/convert/ebook/pdf-to-epub', file, onProgress);
export const mobiToPdf = (file, onProgress) =>
  convert('/api/convert/ebook/mobi-to-pdf', file, onProgress);
export const pdfToMobi = (file, onProgress) =>
  convert('/api/convert/ebook/pdf-to-mobi', file, onProgress);
export const azw3ToPdf = (file, onProgress) =>
  convert('/api/convert/ebook/azw3-to-pdf', file, onProgress);
export const pdfToAzw3 = (file, onProgress) =>
  convert('/api/convert/ebook/pdf-to-azw3', file, onProgress);
