const PREVIEWABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/avif',
]);

const PREVIEWABLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif']);

const CONVERT_FOR_PREVIEW_EXTENSIONS = new Set(['tif', 'tiff', 'eps']);

function getFileExtension(file) {
  return file?.name?.split('.').pop()?.toLowerCase() ?? '';
}

export function isBrowserPreviewableImage(file) {
  if (!file) return false;
  if (file.type && PREVIEWABLE_MIME_TYPES.has(file.type)) return true;
  return PREVIEWABLE_EXTENSIONS.has(getFileExtension(file));
}

export function needsPreviewConversion(file) {
  if (!file) return false;
  if (file.type === 'image/tiff') return true;
  return CONVERT_FOR_PREVIEW_EXTENSIONS.has(getFileExtension(file));
}

export function inferImageMimeType(file) {
  if (file?.type?.startsWith('image/')) return file.type;
  const ext = getFileExtension(file);
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    tif: 'image/tiff',
    tiff: 'image/tiff',
  };
  return map[ext] ?? 'image/png';
}
