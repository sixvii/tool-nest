export function formatAudioFileSize(bytes) {
  if (!bytes) return '';
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
