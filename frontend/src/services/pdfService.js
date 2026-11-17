import api from './api';
import { postWithPolling } from './taskPolling';

const COMPRESS_POLL_URL = '/api/pdf/task';

const getBlobConfig = () => ({
  responseType: 'blob',
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export async function mergePdfs(files) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const { data } = await api.post('/api/pdf/merge', fd, getBlobConfig());
  return data;
}

export async function deletePagesPdf({ file, deletePages }) {
  const fd = new FormData();
  fd.append('file', file);

  const zeroIndexedPages = deletePages.map((pageNum) => pageNum - 1);
  fd.append('pages', zeroIndexedPages.join(','));

  const { data } = await api.post('/api/pdf/delete-pages', fd, getBlobConfig());
  return data;
}

export async function resizePdf({ file, width, height }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('width', String(width));
  fd.append('height', String(height));
  const { data } = await api.post('/api/pdf/resize', fd, getBlobConfig());
  return data;
}

export async function cropPdf({ file, xPercent, yPercent, widthPercent, heightPercent }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('x_percent', String(xPercent));
  fd.append('y_percent', String(yPercent));
  fd.append('width_percent', String(widthPercent));
  fd.append('height_percent', String(heightPercent));
  fd.append('target_pages', 'all');
  const { data } = await api.post('/api/pdf/crop', fd, getBlobConfig());
  return data;
}

export async function compressPdf({ file, compressionLevel }, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('compression_level', String(compressionLevel));
  return postWithPolling(
    api,
    '/api/pdf/compress',
    fd,
    getBlobConfig(),
    COMPRESS_POLL_URL,
    onProgress
  );
}

export async function protectPdf({ file, password }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('password', password);
  const { data } = await api.post('/api/pdf/protect', fd, getBlobConfig());
  return data;
}

export async function unlockPdf({ file, password }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('password', password);
  const { data } = await api.post('/api/pdf/unlock', fd, getBlobConfig());
  return data;
}

export async function splitPdf({ file, pageRanges }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('page_ranges', pageRanges);
  const { data } = await api.post('/api/pdf/split', fd, getBlobConfig());
  return data;
}

export async function watermarkPdf(file, options = {}) {
  const fd = new FormData();
  fd.append('file', file);

  Object.entries(options).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'image' && v instanceof File) {
      fd.append('image', v);
    } else {
      fd.append(k, v);
    }
  });

  const { data } = await api.post('/api/pdf/watermark', fd, getBlobConfig());
  return data;
}

export async function rotatePdf({ file, degrees, pageRanges }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('degrees', String(degrees));
  if (pageRanges) fd.append('page_ranges', pageRanges);

  const { data } = await api.post('/api/pdf/rotate', fd, getBlobConfig());
  return data;
}

export async function rearrangePdf({ file, pageOrder }) {
  const fd = new FormData();
  fd.append('file', file);

  const zeroIndexedPages = pageOrder.map((pageNum) => pageNum - 1);
  fd.append('page_indices', zeroIndexedPages.join(','));

  const { data } = await api.post('/api/pdf/rearrange', fd, getBlobConfig());
  return data;
}

export async function editPdf(file, elements, imageFiles = {}) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('elements', JSON.stringify(elements));
  Object.entries(imageFiles).forEach(([key, f]) => fd.append(key, f));
  const { data } = await api.post('/api/pdf/edit', fd, getBlobConfig());
  return data;
}

export async function parsePdf(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/pdf/parse', fd, {
    headers: {
      'Content-Type': undefined,
      'ngrok-skip-browser-warning': 'true',
    },
  });

  return data;
}

export async function esignPdf(file, cert, formData, sigImage) {
  const fd = new FormData();
  fd.append('file', file);
  if (cert instanceof File) {
    fd.append('certificate', cert);
  }
  if (sigImage instanceof File || sigImage instanceof Blob) {
    fd.append('signature_image', sigImage, 'signature.png');
  }
  Object.entries(formData).forEach(([k, v]) => {
    if (v !== null && v !== undefined) {
      fd.append(k, v);
    }
  });
  const { data } = await api.post('/api/pdf/esign', fd, getBlobConfig());
  return data;
}

export async function extractImagesPdf(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/pdf/extract-images', fd, getBlobConfig());
  return data;
}

export async function replaceTextPdf({ file, searchText, replaceText, mode, matchIndex }) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('search_text', searchText);
  fd.append('replace_text', replaceText);
  fd.append('mode', mode);
  if (mode === 'single') fd.append('match_index', String(matchIndex));
  const { data } = await api.post('/api/pdf/replace-text', fd, getBlobConfig());
  return data;
}
