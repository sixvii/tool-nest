import { useCallback, useEffect, useRef, useState } from 'react';
import { usePersistentToolState } from './usePersistentToolState';
import { useBeforeUnloadWarning } from './useBeforeUnloadWarning';
import { buildPersistKey } from '../utils/persistKey';
import { isRestorablePersistedSnapshot, shouldPersistSnapshot } from '../utils/persistSnapshot';

function snapshotFingerprint(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return '';
  return Object.entries(snapshot)
    .map(([key, value]) => {
      if (value == null) return `${key}:`;
      if (value instanceof Blob) {
        const fileName = typeof value.name === 'string' ? value.name : '';
        return `${key}:${value.size}:${fileName}`;
      }
      if (Array.isArray(value)) {
        const first = value[0];
        if (first instanceof Blob) {
          const fileName = first instanceof File ? first.name : '';
          return `${key}:${value.length}:${first.size}:${fileName}`;
        }
        return `${key}:${value.length}`;
      }
      if (typeof value === 'object') return `${key}:${JSON.stringify(value)}`;
      return `${key}:${String(value)}`;
    })
    .join('|');
}

/**
 * Persists a tool's working state (uploaded file(s), options, text, result blob)
 * across page reloads and restores it once on mount.
 *
 * Persistence owner convention:
 * - Generic workspace tools: WorkspaceCard owns snapshot (persistScope='workspace').
 * - Custom flows (video trimmer, PDF editor): page-level hook owns snapshot;
 *   set WorkspaceCard persistScope='none' to avoid duplicate writes.
 *
 * @param {object}   params
 * @param {object}   params.snapshot       - Current serializable state to persist (may include File/Blob).
 * @param {boolean}  params.hasContent     - When false, stored state is cleared after restore settles.
 * @param {Function} params.onRestore      - Called once with the restored snapshot; return true if UI state was applied.
 * @param {boolean}  [params.warnOnUnload] - Native "leave site?" prompt while there's content.
 * @param {string}   [params.toolName]     - Preferred key segment when multiple tools share a route.
 * @param {string}   [params.namespace]    - Fallback key segment (e.g. PDF tab tools).
 * @param {string}   [params.instanceId]   - Optional extra key segment.
 * @param {string}   [params.persistKey]   - Full storage key override (skips buildPersistKey).
 * @param {boolean}  [params.enabled]      - When false, persistence and restore are skipped.
 * @param {boolean}  [params.persistBlobs=true] - When false, debounced saves strip blobs; pagehide still flushes full snapshot.
 * @param {number}   [params.ttlMs]        - Per-tool TTL override passed to loadToolState.
 * @param {Function} [params.onRestoreNotification] - Called when a restore is applied (for UI banners).
 */
export function useToolPersistence({
  snapshot,
  hasContent,
  onRestore,
  warnOnUnload = false,
  toolName,
  namespace,
  instanceId,
  persistKey: customKey,
  enabled = true,
  persistBlobs = true,
  ttlMs,
  onRestoreNotification,
}) {
  const [key] = useState(() => {
    if (!enabled) return '';
    if (customKey) return customKey;
    return buildPersistKey({ toolName, namespace, instanceId });
  });

  const { restored, isHydrated, persist, clear } = usePersistentToolState(key, {
    enabled,
    ttlMs,
  });

  const [isRestoreSettled, setIsRestoreSettled] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const restoredOnceRef = useRef(false);
  const pendingRestoreRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const onRestoreRef = useRef(onRestore);
  const onRestoreNotificationRef = useRef(onRestoreNotification);
  const snapshotFingerprintValue = snapshotFingerprint(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  });

  useEffect(() => {
    onRestoreRef.current = onRestore;
  });

  useEffect(() => {
    onRestoreNotificationRef.current = onRestoreNotification;
  });

  useBeforeUnloadWarning(warnOnUnload && Boolean(hasContent));

  // Apply restored snapshot once after hydration (deferred to avoid sync setState in effect).
  useEffect(() => {
    if (!isHydrated || isRestoreSettled) return undefined;

    if (!restored) {
      const timer = setTimeout(() => setIsRestoreSettled(true), 0);
      return () => clearTimeout(timer);
    }

    if (restoredOnceRef.current) return undefined;

    const snapshotToRestore = restored;

    if (!isRestorablePersistedSnapshot(snapshotToRestore)) {
      restoredOnceRef.current = true;
      clear();
      const timer = setTimeout(() => setIsRestoreSettled(true), 0);
      return () => clearTimeout(timer);
    }

    pendingRestoreRef.current = true;
    const timer = setTimeout(() => {
      if (restoredOnceRef.current) return;
      restoredOnceRef.current = true;
      const result = onRestoreRef.current?.(snapshotToRestore);
      pendingRestoreRef.current = result !== false;
      if (result === true) {
        setSessionRestored(true);
        onRestoreNotificationRef.current?.(snapshotToRestore);
      }
      setIsRestoreSettled(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [isHydrated, restored, isRestoreSettled, clear]);

  // Keep grace window open while waiting for restored setState to flip hasContent.
  useEffect(() => {
    if (!isRestoreSettled || !pendingRestoreRef.current) return undefined;
    if (hasContent) {
      pendingRestoreRef.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      pendingRestoreRef.current = false;
    }, 2000);
    return () => clearTimeout(timer);
  }, [isRestoreSettled, hasContent]);

  // Debounce fingerprint tick — triggers the debounced persist effect below.
  const [persistTick, setPersistTick] = useState(0);
  useEffect(() => {
    if (!hasContent) return undefined;
    const timer = setTimeout(() => setPersistTick((n) => n + 1), 0);
    return () => clearTimeout(timer);
  }, [hasContent, snapshotFingerprintValue]);

  // Debounced persist/clear — waits until restore has finished to avoid wiping stored state.
  // When persistBlobs is false, skip debounced saves (they would store metadata-only blobs
  // that break restore). Rely on pagehide / visibilitychange to flush the full snapshot.
  useEffect(() => {
    if (!isHydrated || !isRestoreSettled) return undefined;
    const timer = setTimeout(() => {
      if (hasContent) {
        pendingRestoreRef.current = false;
        if (persistBlobs) {
          persist(snapshotRef.current);
        }
        return;
      }
      if (pendingRestoreRef.current) return;
      clear();
    }, 400);
    return () => clearTimeout(timer);
  }, [isHydrated, isRestoreSettled, hasContent, persistTick, persist, clear, persistBlobs]);

  const flushSnapshot = useCallback(() => {
    if (!enabled) return;
    const snap = snapshotRef.current;
    if (!shouldPersistSnapshot(snap)) return;
    pendingRestoreRef.current = false;
    persist(snap);
  }, [enabled, persist]);

  // pagehide + visibilitychange flush: always persist the full snapshot (including blobs).
  useEffect(() => {
    if (!enabled || !isHydrated) return undefined;
    const onHide = () => flushSnapshot();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, isHydrated, flushSnapshot]);

  const dismissSession = useCallback(() => setSessionRestored(false), []);

  const clearSession = useCallback(() => {
    clear();
    setSessionRestored(false);
    restoredOnceRef.current = false;
  }, [clear]);

  return {
    isRestoreSettled,
    isHydrated,
    sessionRestored,
    dismissSession,
    clearSession,
  };
}
