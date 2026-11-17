import { useState } from 'react';
import WorkspaceCard from '../../components/WorkspaceCard';
import { viewImageMetadata } from '../../services/imageService';
import { validateFile } from '../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import RemoveMetadata from './RemoveMetadata';
import InfoRow from '../../components/image/Inforow';
import FileFallbackIcon from '../../components/image/Filefallbackicon';
import { formatBytes, classifyEntries } from '../../utils/image/imageMetadata/Imagemetadatautils';
import { useToolPersistence } from '../../hooks/useToolPersistence';

import {
  PREVIEWABLE_TYPES,
  METADATA_GROUPS,
} from '../../constants/image/imageMetadataConstants/imageMetadataConstants';

export default function ViewMetadata() {
  const [metadata, setMetadata] = useState(null);
  const [basicInfo, setBasicInfo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [canPreview, setCanPreview] = useState(true);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFilesChange = (files) => {
    setMetadata(null);
    setBasicInfo(null);
    setErrorMsg('');

    const f = files[0];

    setFile(f || null);
    setFileName(f?.name || '');

    if (f) {
      setPreviewUrl(URL.createObjectURL(f));
      setCanPreview(PREVIEWABLE_TYPES.has(f.type));

      setIsProcessing(true);

      handleActionSubmit({ files: [f] })
        .catch((err) =>
          setErrorMsg(err.message || 'Something went wrong while processing this image.')
        )
        .finally(() => setIsProcessing(false));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleActionSubmit = async ({ files }) => {
    const f = files[0];

    try {
      validateFile(f, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      throw new Error(err.message, { cause: err });
    }

    const dimensions = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: null, height: null });
      img.src = URL.createObjectURL(f);
    });

    setBasicInfo({
      name: f.name,
      size: f.size,
      type: f.type.split('/')[1]?.toUpperCase() || 'Unknown',
      mime: f.type,
      width: dimensions.width,
      height: dimensions.height,
    });

    const response = await viewImageMetadata(f);
    const data = response?.metadata ?? response;
    const isEmptyMessage = data && Object.keys(data).length === 1 && 'message' in data;

    setMetadata(isEmptyMessage ? {} : data);

    return null;
  };

  const handleReset = () => {
    setMetadata(null);
    setBasicInfo(null);
    setPreviewUrl(null);
    setFileName('');
    setCanPreview(true);
    setFile(null);
    clearSession();
  };

  const hasContent = Boolean(file);

  const handleRestore = (snapshot) => {
    if (!snapshot?.file) return false;

    const restoredFile = snapshot.file;

    setFile(restoredFile);
    setFileName(snapshot.fileName || restoredFile.name);
    setPreviewUrl(URL.createObjectURL(restoredFile));
    setCanPreview(PREVIEWABLE_TYPES.has(restoredFile.type));

    if (snapshot.metadata && snapshot.basicInfo) {
      setMetadata(snapshot.metadata);
      setBasicInfo(snapshot.basicInfo);
    } else {
      setIsProcessing(true);
      handleActionSubmit({ files: [restoredFile] })
        .catch((err) =>
          setErrorMsg(err.message || 'Something went wrong while processing this image.')
        )
        .finally(() => setIsProcessing(false));
    }

    return true;
  };

  const { sessionRestored, dismissSession, clearSession } = useToolPersistence({
    snapshot: { file, fileName, metadata, basicInfo },
    hasContent,
    onRestore: handleRestore,
    warnOnUnload: true,
    toolName: 'view-metadata',
  });

  if (metadata !== null && basicInfo) {
    const { groups, technical, other, sensitiveCount } = classifyEntries(metadata);

    const hasSensitive = sensitiveCount > 0;

    const technicalAndOther = [...technical, ...other];

    const megapixels =
      basicInfo.width && basicInfo.height
        ? ((basicInfo.width * basicInfo.height) / 1_000_000).toFixed(1)
        : null;

    return (
      <div className="grid grid-cols-[1fr_340px] gap-10 items-start">
        {sessionRestored && (
          <div className="col-span-2 flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium">Previous session restored</p>
            <button
              onClick={dismissSession}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            {canPreview && previewUrl ? (
              <img
                src={previewUrl}
                alt={fileName}
                className="w-20 h-20 rounded-lg border border-slate-200 object-contain flex-shrink-0"
              />
            ) : (
              <FileFallbackIcon />
            )}

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{fileName}</p>

              <p className="text-xs text-slate-400 mt-0.5">
                {basicInfo.width && `${basicInfo.width} x ${basicInfo.height} · `}
                {formatBytes(basicInfo.size)}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>

              <h2 className="text-lg font-bold text-slate-900">File Info</h2>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
              <InfoRow label="Name" value={basicInfo.name} />
              <InfoRow label="File size" value={formatBytes(basicInfo.size)} />
              <InfoRow label="File type" value={basicInfo.type} />
              <InfoRow label="MIME type" value={basicInfo.mime} />

              {basicInfo.width && (
                <InfoRow
                  label="Image size"
                  value={`${basicInfo.width} x ${basicInfo.height} (${megapixels} megapixels)`}
                />
              )}
            </div>
          </div>

          {hasSensitive && (
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Metadata</h2>

              <div className="flex flex-col gap-4">
                {METADATA_GROUPS.map((groupName) => {
                  const fields = groups[groupName];

                  if (!fields || fields.length === 0) return null;

                  return (
                    <div key={groupName}>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-900 mb-1.5 px-1">
                        {groupName}
                      </p>

                      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                        {fields.map(({ key, label, value }) => (
                          <InfoRow key={key} label={label} value={String(value)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {technicalAndOther.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-900">Technical Info</h2>

                <span className="text-xs font-semibold text-slate-500">
                  {technicalAndOther.length} fields
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                {technicalAndOther.map(({ key, label, value }) => (
                  <InfoRow key={key} label={label} value={String(value)} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 sticky top-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[480px]">
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-black tracking-widest uppercase text-blue-500">
                Workspace
              </p>

              <h2 className="text-xl font-bold text-slate-800 mt-1">Image Metadata</h2>
            </div>

            <div className="px-6 py-6 flex flex-col gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Privacy Status
                </p>

                {hasSensitive ? (
                  <div className="flex items-start gap-2 text-amber-600 text-sm font-semibold">
                    <svg
                      className="w-5 h-5 mt-0.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                    Sensitive metadata detected
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    No sensitive metadata
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Data Found
                </p>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Metadata fields</span>

                    <span className="text-slate-900 font-bold text-base">{sensitiveCount}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Technical fields</span>

                    <span className="text-slate-900 font-bold text-base">
                      {technicalAndOther.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasSensitive && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden px-6 py-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Remove Metadata
              </p>

              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Download a clean copy of this image with all sensitive metadata stripped.
              </p>

              <RemoveMetadata file={file} fileName={fileName} />
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 text-white bg-blue-600 hover:bg-blue-700 text-sm font-bold py-3 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l3 3m-3-3l-3 3"
              />
            </svg>
            Upload Another Image
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceCard
        toolName="Image Metadata Viewer"
        acceptTypes="image/*"
        allowMultiple={false}
        onFilesChange={handleFilesChange}
        onActionSubmit={handleActionSubmit}
        persistScope="none"
      />

      {errorMsg && !isProcessing && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
          <svg
            className="w-4 h-4 text-red-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>

          <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
