export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getImageMimeLabel(mimeType) {
  if (!mimeType?.startsWith('image/')) return '';
  return mimeType.replace('image/', '').toUpperCase();
}

export function getImageFileMeta(file) {
  if (!file) return null;
  const typeLabel = getImageMimeLabel(file.type);
  return {
    name: file.name,
    sizeLabel: formatFileSize(file.size),
    typeLabel,
    detailLabel: typeLabel
      ? `${formatFileSize(file.size)} · ${typeLabel}`
      : formatFileSize(file.size),
  };
}

export function resetFileInput(event) {
  if (event?.target) event.target.value = '';
}
