import { FILE_TYPE_MAP } from '../constants/previewConstants';

export function detectFileType(file) {
  if (!file) return null;
  const mapped = FILE_TYPE_MAP[file.type];
  if (mapped) return mapped;
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'generic';
}
