import { useEffect, useState } from 'react';
import { createPreviewURL, revokePreviewURL } from '../utils/fileUtils';
import { needsPreviewConversion } from '../utils/image/imagePreviewSource';
import { resolvePreviewableBlob } from '../utils/image/resolvePreviewableImage';

function getBlobSourceKey(source) {
  if (!source) return null;
  if (source instanceof File) {
    return `file:${source.name}:${source.size}:${source.lastModified}:${source.type}`;
  }
  return `blob:${source.size}:${source.type}`;
}

async function createUrlForSource(source) {
  if (source instanceof File && needsPreviewConversion(source)) {
    const previewBlob = await resolvePreviewableBlob(source);
    return createPreviewURL(previewBlob);
  }
  return createPreviewURL(source);
}

/**
 * Creates an object URL for a File/Blob and revokes it when the source changes or unmounts.
 * TIFF and other non-browser formats are converted to PNG for preview via the existing API.
 */
export function useBlobPreviewUrl(source) {
  const sourceKey = getBlobSourceKey(source);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- object URL must sync with blob lifecycle */
    if (!source) {
      setUrl(null);
      return undefined;
    }

    let cancelled = false;
    let objectUrl = null;

    const load = async () => {
      try {
        objectUrl = await createUrlForSource(source);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setUrl(null);
      }
    };

    load();

    return () => {
      cancelled = true;
      revokePreviewURL(objectUrl);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [source, sourceKey]);

  return url;
}

export function useImageToolPreviewUrls(file, resultBlob) {
  const originalUrl = useBlobPreviewUrl(file);
  const resultUrl = useBlobPreviewUrl(resultBlob);

  return { originalUrl, resultUrl };
}
