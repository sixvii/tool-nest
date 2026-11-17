import { useCallback, useEffect, useState } from 'react';
import { clearToolState, loadToolState, saveToolState } from '../utils/toolStatePersistence';

/**
 * Persists a tool's working state (uploaded files, settings, result) across page
 * reloads using IndexedDB, keyed by a stable identifier (usually the route path).
 *
 * Returns:
 * - restored: the persisted value once hydrated (null if none)
 * - isHydrated: true after the initial IndexedDB read resolves
 * - persist(value): save the current state (best-effort, debounce at call site)
 * - clear(): remove any persisted state for this key
 */
export function usePersistentToolState(key, { enabled = true, ttlMs } = {}) {
  const shouldPersist = enabled && Boolean(key);
  const [entry, setEntry] = useState({ loadedKey: null, restored: null });

  const isHydrated = !shouldPersist || entry.loadedKey === key;
  const restored = isHydrated ? entry.restored : null;

  useEffect(() => {
    if (!shouldPersist) return undefined;

    let cancelled = false;
    loadToolState(key, ttlMs).then((value) => {
      if (cancelled) return;
      setEntry({ loadedKey: key, restored: value });
    });

    return () => {
      cancelled = true;
    };
  }, [key, shouldPersist, ttlMs]);

  const persist = useCallback(
    (value) => {
      if (!shouldPersist) return;
      saveToolState(key, value);
    },
    [key, shouldPersist]
  );

  const clear = useCallback(() => {
    if (!key) return;
    clearToolState(key);
    setEntry({ loadedKey: key, restored: null });
  }, [key]);

  return { restored, isHydrated, persist, clear };
}
