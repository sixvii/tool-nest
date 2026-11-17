import { convertImageFormat } from '../../services/imageService';
import { inferImageMimeType, needsPreviewConversion } from './imagePreviewSource';

export async function resolvePreviewableBlob(source) {
  if (!source) return null;

  if (source instanceof File && needsPreviewConversion(source)) {
    const { data } = await convertImageFormat([source], 'png');
    return data;
  }

  if (source instanceof File && !source.type) {
    return new Blob([source], { type: inferImageMimeType(source) });
  }

  return source;
}
