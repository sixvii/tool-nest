import api from './api';
import { FORMAT_MAP, normalizeExt } from '../constants/image/imageConstants';
import { FA_API_TIMEOUT_MS } from '../constants/image/fontAwesomeIcons';
import { throwFontAwesomeApiError } from '../utils/image/fontAwesomeApiError';
import { postWithPolling, postWithPollingResponse } from './taskPolling';

const OCR_POLL_URL = '/api/convert/data/task';
const CONVERT_IMAGE_POLL_URL = '/api/convert/image/task';
const IMAGE_TASK_POLL_URL = '/api/image/task';

const BLOB = {
  responseType: 'blob',
  headers: { 'Content-Type': undefined, 'ngrok-skip-browser-warning': 'true' },
};

const JSON_HEADERS = {
  headers: { 'Content-Type': undefined, 'ngrok-skip-browser-warning': 'true' },
};

function buildFormData(fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([key, value]) => fd.append(key, value));
  return fd;
}

async function postImageBlob(url, fields, config = BLOB) {
  const { data } = await api.post(url, buildFormData(fields), config);
  return data;
}
export async function imageToText(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(
    api,
    '/api/convert/data/image-to-text',
    fd,
    BLOB,
    OCR_POLL_URL,
    onProgress
  );
}

export const resizeImage = (file, width, height) =>
  postImageBlob('/api/image/resize', { file, width, height });

export const compressImage = (file, quality) =>
  postImageBlob('/api/image/compress', { file, quality });

export const flipImage = (file, direction) => postImageBlob('/api/image/flip', { file, direction });

export const blackAndWhiteImage = (file) => postImageBlob('/api/image/black-and-white', { file });

export const cropImage = (file, { x, y, width, height }) =>
  postImageBlob('/api/image/crop', { file, x, y, width, height });

export async function fontAwesomeToPng(iconUnicode, size, color) {
  try {
    return await postImageBlob(
      '/api/image/font-awesome-to-png',
      { icon_unicode: iconUnicode, size: String(size), color },
      { ...BLOB, timeout: FA_API_TIMEOUT_MS }
    );
  } catch (err) {
    return throwFontAwesomeApiError(err, {
      timeoutMessage: 'Request timed out. The server may be waking up — please try again.',
    });
  }
}

export async function addBorderImage(file, borderWidth, colorHex, borderStyle = 'solid') {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('border_width', borderWidth);
  fd.append('color_hex', colorHex);
  fd.append('style', borderStyle);
  const { data } = await api.post('/api/image/add-border', fd, BLOB);
  return data;
}

export async function viewImageMetadata(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/api/image/view-metadata', fd, JSON_HEADERS);
  return data;
}

export async function removeImageMetadata(file) {
  return postImageBlob('/api/image/remove-metadata', { file });
}

export async function convertImageFormat(files, targetExt, onProgress) {
  const sourceExt = normalizeExt(files[0].name.split('.').pop().toLowerCase());
  const config = FORMAT_MAP[sourceExt]?.[targetExt];

  if (!config) throw new Error(`Conversion from .${sourceExt} to .${targetExt} is not supported.`);

  const fd = new FormData();
  if (config.multi) {
    files.forEach((f) => fd.append('files', f));
  } else {
    fd.append('file', files[0]);
  }

  const response = await postWithPollingResponse(
    api,
    config.url,
    fd,
    BLOB,
    CONVERT_IMAGE_POLL_URL,
    onProgress
  );
  const contentType = response.headers?.['content-type'] ?? '';
  const isZip = contentType.includes('application/zip');
  return { data: response.data, ext: isZip ? 'zip' : targetExt };
}

export async function splitImage(file, gridRows, gridCols) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('grid_rows', gridRows);
  fd.append('grid_cols', gridCols);
  const { data } = await api.post('/api/image/split-image', fd, BLOB);
  return data;
}

export async function combineImages(files, layoutType = 'grid') {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  fd.append('layout_type', layoutType);
  const { data } = await api.post('/api/image/combine-images', fd, BLOB);
  return data;
}
export async function profilePhotoMaker(file, bgColor = '') {
  const fd = new FormData();
  fd.append('file', file);
  if (bgColor) fd.append('bg_color', bgColor);
  const { data } = await api.post('/api/image/profile-photo-maker', fd, BLOB);
  return data;
}
export async function removeBackground(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(
    api,
    '/api/image/remove-background',
    fd,
    BLOB,
    IMAGE_TASK_POLL_URL,
    onProgress
  );
}

export async function transparentBackground(file, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  return postWithPolling(
    api,
    '/api/image/transparent-background',
    fd,
    BLOB,
    IMAGE_TASK_POLL_URL,
    onProgress
  );
}

export async function blurBackground(file, radius, onProgress) {
  const fd = new FormData();
  fd.append('file', file);
  if (radius !== undefined) fd.append('radius', radius);
  return postWithPolling(
    api,
    '/api/image/blur-background',
    fd,
    BLOB,
    IMAGE_TASK_POLL_URL,
    onProgress
  );
}
