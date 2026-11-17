import { notifyDownload, toastSuccess } from './toastUtils';
import { inferImageMimeType } from './image/imagePreviewSource';

export function validateFile(file, { maxSizeMB = 10, allowedTypes = [] } = {}) {
  if (allowedTypes.length && !allowedTypes.some((t) => file.type.startsWith(t))) {
    throw new Error('File type not supported.');
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(
      `File size must be under ${maxSizeMB}MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB.`
    );
  }
}

export function makeId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2); // NOSONAR: local React key/list-identity only, not security-sensitive
}

export function createPreviewURL(file) {
  if (!(file instanceof Blob)) return null;
  if (file instanceof File && !file.type) {
    const typed = new Blob([file], { type: inferImageMimeType(file) });
    return URL.createObjectURL(typed);
  }
  return URL.createObjectURL(file);
}

export function isRestorableBlob(value) {
  if (!value || typeof value.size !== 'number' || value.size <= 0) return false;
  return value instanceof Blob || typeof value.arrayBuffer === 'function';
}

export function restoreBlob(value) {
  if (!isRestorableBlob(value)) return null;
  return value;
}

/** Rehydrate a File from IndexedDB (Blob-like objects may lose the File prototype/name). */
export function restoreFile(value, fallbackName = 'upload') {
  if (!isRestorableBlob(value)) return null;
  if (value instanceof File && value.name) return value;
  const name =
    (typeof value.name === 'string' && value.name) ||
    (typeof fallbackName === 'string' && fallbackName) ||
    'upload';
  const type = typeof value.type === 'string' ? value.type : '';
  const lastModified = typeof value.lastModified === 'number' ? value.lastModified : Date.now();
  return new File([value], name, { type, lastModified });
}

export function revokePreviewURL(url) {
  if (url) URL.revokeObjectURL(url);
}

export function stripFileExtension(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

export function buildDerivedFilename(filename, { suffix, extension }) {
  return `${stripFileExtension(filename)}-${suffix}.${extension}`;
}

export function downloadBlob(blob, filename, { silent } = {}) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (!silent) {
    notifyDownload(filename, blob.size);
  }
}

export async function convertMultiple(files, serviceFn, outputExt) {
  let count = 0;
  for (const file of files) {
    const data = await serviceFn(file);
    const blob = data instanceof Blob ? data : new Blob([data]);
    const name = stripFileExtension(file.name);
    downloadBlob(blob, `${name}.${outputExt}`, { silent: true });
    count++;
  }
  if (count > 0) {
    toastSuccess(`Downloaded ${count} file${count > 1 ? 's' : ''}`);
  }
}
