import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildPersistKey } from './persistKey.js';

describe('buildPersistKey', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true);
  });

  it('builds deterministic key with toolName', () => {
    expect(buildPersistKey({ pathname: '/foo', toolName: 'PdfCrop', namespace: 'pdf-crop' })).toBe(
      'tool:/foo:PdfCrop'
    );
  });

  it('uses namespace when toolName is absent', () => {
    expect(buildPersistKey({ pathname: '/pdf/crop', namespace: 'pdf-crop' })).toBe(
      'tool:/pdf/crop:pdf-crop'
    );
  });

  it('produces different keys for different tools on the same pathname', () => {
    const path = '/convert/image';
    const a = buildPersistKey({ pathname: path, toolName: 'WebP to JPG' });
    const b = buildPersistKey({ pathname: path, toolName: 'PNG to JPG' });
    expect(a).not.toBe(b);
  });

  it('appends instanceId when provided', () => {
    expect(
      buildPersistKey({ pathname: '/pdf/edit', toolName: 'Edit PDF', instanceId: 'editor' })
    ).toBe('tool:/pdf/edit:Edit PDF:editor');
  });

  it('normalizes trailing slashes on pathname', () => {
    expect(buildPersistKey({ pathname: '/foo/', namespace: 'bar' })).toBe('tool:/foo:bar');
  });

  it('falls back to default segment and warns in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(buildPersistKey({ pathname: '/solo' })).toBe('tool:/solo:default');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
