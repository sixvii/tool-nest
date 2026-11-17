const DB_NAME = 'toolnest-state';
const STORE_NAME = 'toolState';
const DB_VERSION = 1;

// Restored state older than this is treated as stale and discarded.
// Short-lived on purpose: it's a reload safety-net, not long-term storage, and
// switching to another tool for longer than this drops the previous tool's state.
export const TOOL_STATE_TTL_MS = 60 * 1000; // 60 seconds

/** Longer TTL for media tools — uploads take time and blobs are large. */
export const MEDIA_TOOL_STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}

function reportPersistenceError(operation, error) {
  const message = error?.message ?? String(error);
  if (import.meta.env?.DEV) {
    console.warn(`[toolStatePersistence] ${operation} failed:`, message);
  }
  window.__telemetry?.report?.('persistence_error', { operation, message });
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      const error = new Error('IndexedDB is not available.');
      reportPersistenceError('openDb', error);
      reject(error);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onblocked = () => {
      reportPersistenceError(
        'openDb',
        new Error('IndexedDB open blocked — close other tabs using this app.')
      );
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => {
      reportPersistenceError('openDb', request.error);
      reject(request.error);
    };
  });
}

/**
 * Persists arbitrary tool state (including File/Blob values, via structured clone)
 * under a stable key. Failures are logged but never break a tool.
 */
export async function saveToolState(key, value) {
  if (!key) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ ...value, savedAt: Date.now() }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    reportPersistenceError('save', error);
  }
}

/**
 * Reads persisted tool state for a key. Returns null when missing, unavailable,
 * or older than the TTL (stale entries are cleared).
 *
 * @param {string} key
 * @param {number} [ttlMs=TOOL_STATE_TTL_MS] - Per-call TTL override; 0 disables expiry check.
 */
export async function loadToolState(key, ttlMs = TOOL_STATE_TTL_MS) {
  if (!key) return null;
  try {
    const db = await openDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();

    if (!value) return null;
    if (ttlMs && value.savedAt && Date.now() - value.savedAt > ttlMs) {
      await clearToolState(key);
      return null;
    }
    const { savedAt, ...data } = value;
    void savedAt;
    return data;
  } catch (error) {
    reportPersistenceError('load', error);
    return null;
  }
}

export async function clearToolState(key) {
  if (!key) return;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    reportPersistenceError('clear', error);
  }
}
