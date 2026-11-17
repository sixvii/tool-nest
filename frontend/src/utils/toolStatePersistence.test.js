import { describe, expect, it, vi } from 'vitest';
import { saveToolState, loadToolState, clearToolState } from './toolStatePersistence.js';

describe('toolStatePersistence', () => {
  it('saves and loads state', async () => {
    await saveToolState('tool:/test:demo', { value: 42 });
    const loaded = await loadToolState('tool:/test:demo');
    expect(loaded).toEqual({ value: 42 });
  });

  it('returns null for missing keys', async () => {
    const loaded = await loadToolState('tool:/missing:key');
    expect(loaded).toBeNull();
  });

  it('expires stale entries using TTL', async () => {
    await saveToolState('tool:/test:ttl', { value: 'old' });
    await new Promise((resolve) => setTimeout(resolve, 25));
    const loaded = await loadToolState('tool:/test:ttl', 10);
    expect(loaded).toBeNull();
  });

  it('honors per-call TTL override', async () => {
    await saveToolState('tool:/test:custom-ttl', { value: 'fresh' });
    await new Promise((resolve) => setTimeout(resolve, 25));
    const loaded = await loadToolState('tool:/test:custom-ttl', 60_000);
    expect(loaded).toEqual({ value: 'fresh' });
  });

  it('clears stored state', async () => {
    await saveToolState('tool:/test:clear', { value: 1 });
    await clearToolState('tool:/test:clear');
    const loaded = await loadToolState('tool:/test:clear');
    expect(loaded).toBeNull();
  });

  it('logs warnings on failure in dev', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const open = indexedDB.open;
    indexedDB.open = () => {
      throw new Error('blocked');
    };

    await saveToolState('tool:/fail', { x: 1 });
    expect(warn).toHaveBeenCalled();

    indexedDB.open = open;
    warn.mockRestore();
  });
});
