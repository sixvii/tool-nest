/**
 * Replaces Blob/File values with lightweight metadata for debounced persistence.
 * Full blobs are still flushed on pagehide when persistBlobs is disabled.
 */
export function blobToMeta(value) {
  if (!(value instanceof Blob)) return null;
  const meta = {
    __blobMeta: true,
    size: value.size,
    type: value.type,
  };
  if (value instanceof File && value.name) meta.name = value.name;
  return meta;
}

export function isBlobMeta(value) {
  return Boolean(value && typeof value === 'object' && value.__blobMeta === true);
}

/** True when the persisted snapshot still has real Blob/File bytes (not metadata placeholders). */
export function snapshotHasBlobData(value) {
  if (value instanceof Blob) return true;
  if (value == null || isBlobMeta(value)) return false;
  if (Array.isArray(value)) return value.some(snapshotHasBlobData);
  if (typeof value === 'object') return Object.values(value).some(snapshotHasBlobData);
  return false;
}

const TEXT_SNAPSHOT_KEYS = [
  'text',
  'inputText',
  'input',
  'output',
  'inputJSON',
  'outputJSON',
  'xmlInput',
  'xmlResult',
  'csvPreview',
  'result',
  'extractedText',
  'outputText',
  'findText',
  'replaceText',
  'search',
  'replace',
  'url',
  // PDF e-sign
  'signText',
];

/** True when snapshot has restorable text content (not filenames or option labels). */
export function snapshotHasTextData(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  return TEXT_SNAPSHOT_KEYS.some((key) => {
    const value = snapshot[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

/** Whether IndexedDB data is worth applying — excludes metadata-only blob placeholders. */
export function isRestorablePersistedSnapshot(snapshot) {
  return snapshotHasBlobData(snapshot) || snapshotHasTextData(snapshot);
}

/** Whether a snapshot is worth writing to IndexedDB (avoids overwriting good state with empties). */
export function shouldPersistSnapshot(snapshot) {
  return isRestorablePersistedSnapshot(snapshot);
}

export function stripBlobsFromSnapshot(value) {
  if (value == null) return value;
  if (value instanceof Blob) return blobToMeta(value);
  if (Array.isArray(value)) return value.map(stripBlobsFromSnapshot);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, stripBlobsFromSnapshot(entry)])
    );
  }
  return value;
}
