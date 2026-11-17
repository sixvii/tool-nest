import { describe, expect, it } from 'vitest';
import {
  stripBlobsFromSnapshot,
  isBlobMeta,
  isRestorablePersistedSnapshot,
  shouldPersistSnapshot,
  snapshotHasBlobData,
} from './persistSnapshot.js';

describe('stripBlobsFromSnapshot', () => {
  it('replaces File with metadata', () => {
    const file = new File(['hello'], 'test.mp4', { type: 'video/mp4' });
    const stripped = stripBlobsFromSnapshot({ file, label: 'x' });
    expect(stripped.file).toEqual({
      __blobMeta: true,
      size: file.size,
      type: 'video/mp4',
      name: 'test.mp4',
    });
    expect(stripped.label).toBe('x');
  });

  it('strips blobs inside arrays', () => {
    const blob = new Blob(['a'], { type: 'text/plain' });
    const stripped = stripBlobsFromSnapshot({ files: [blob] });
    expect(isBlobMeta(stripped.files[0])).toBe(true);
    expect(stripped.files[0].size).toBe(blob.size);
  });

  it('detects metadata-only snapshots as not restorable', () => {
    expect(
      isRestorablePersistedSnapshot({
        file: { __blobMeta: true, size: 10, name: 'clip.mp4' },
        fileName: 'clip.mp4',
        selectedFormat: 'mp3',
      })
    ).toBe(false);
  });

  it('detects real blob snapshots as restorable', () => {
    const file = new File(['a'], 'clip.mp4', { type: 'video/mp4' });
    expect(snapshotHasBlobData({ file, selectedFormat: 'mp3' })).toBe(true);
  });

  it('detects text snapshots as restorable', () => {
    expect(isRestorablePersistedSnapshot({ text: 'hello' })).toBe(true);
  });

  it('detects e-sign snapshots as restorable via signText', () => {
    expect(isRestorablePersistedSnapshot({ signText: 'John' })).toBe(true);
  });

  it('detects json/xml converter snapshots as restorable via input/output', () => {
    expect(
      isRestorablePersistedSnapshot({
        input: '{"name":"test"}',
        output: '<root><name>test</name></root>',
      })
    ).toBe(true);
  });

  it('detects JSON formatter snapshots as restorable', () => {
    expect(isRestorablePersistedSnapshot({ inputJSON: '{ "a": 1 }' })).toBe(true);
  });

  it('shouldPersistSnapshot mirrors isRestorablePersistedSnapshot', () => {
    const metaOnly = { file: { __blobMeta: true, size: 10, name: 'clip.mp4' } };
    expect(shouldPersistSnapshot(metaOnly)).toBe(false);
    const file = new File(['a'], 'clip.mp4', { type: 'video/mp4' });
    expect(shouldPersistSnapshot({ file })).toBe(true);
  });
});
