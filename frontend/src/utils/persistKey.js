/**
 * Builds a deterministic, collision-resistant IndexedDB key for tool state.
 *
 * Format: tool:<pathname>:<toolName|namespace|default>[:<instanceId>]
 *
 * @param {object} [params]
 * @param {string} [params.pathname] - Route path (defaults to window.location.pathname).
 * @param {string} [params.toolName] - Human/registry tool name; preferred when multiple tools share a route.
 * @param {string} [params.namespace] - Fallback disambiguator (e.g. PDF tab tools).
 * @param {string} [params.instanceId] - Optional extra segment for multiple slots on one tool.
 * @returns {string}
 */
export function buildPersistKey({ pathname, toolName, namespace, instanceId } = {}) {
  const rawPath = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
  const base = rawPath.replace(/\/+$/, '') || '/';
  const id = toolName ?? namespace ?? 'default';

  if (!toolName && !namespace && import.meta.env?.DEV) {
    console.warn(
      '[persistKey] buildPersistKey called without toolName or namespace; using "default" segment.',
      { pathname: base }
    );
  }

  const key = `tool:${base}:${id}`;
  return instanceId ? `${key}:${instanceId}` : key;
}
