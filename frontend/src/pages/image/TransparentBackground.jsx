import { useState } from 'react';
import { Download } from 'lucide-react';
import WorkspaceCard from '../../components/WorkspaceCard';
import ImageLoader from '../../components/loaders/ImageLoader';
import Button from '../../components/ui/Button';
import { removeBackground } from '../../services/imageService';
import { validateFile, downloadBlob, buildDerivedFilename } from '../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { useToolPersistence } from '../../hooks/useToolPersistence';

export default function TransparentBackground() {
  const [file, setFile] = useState(null);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const processFile = async (f) => {
    setProcessing(true);
    setError('');
    try {
      const blob = await removeBackground(f);
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to remove background. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleFilesChange = (files) => {
    setResultBlob(null);
    setResultUrl(null);
    setError('');
    const f = files[0];
    if (!f) return;
    try {
      validateFile(f, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(err.message);
      return;
    }
    setFile(f);
    setFileName(f.name);
    setFileSize(f.size);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
    const img = new Image();
    img.onload = () => {
      setOrigW(img.naturalWidth);
      setOrigH(img.naturalHeight);
    };
    img.src = url;
    processFile(f);
  };

  const handleActionSubmit = async ({ files }) => {
    const f = files[0];
    if (!f.type.startsWith('image/')) {
      throw new Error('Only image files are supported.');
    }
    return null;
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(
      resultBlob,
      buildDerivedFilename(fileName, { suffix: 'transparent', extension: 'png' })
    );
  };

  const handleReset = () => {
    setFile(null);
    setResultBlob(null);
    setResultUrl(null);
    setOriginalUrl(null);
    setFileName('');
    setFileSize(0);
    setOrigW(0);
    setOrigH(0);
    setError('');
    clearSession();
  };

  const hasContent = Boolean(file);

  const handleRestore = (snapshot) => {
    if (!snapshot?.file) return false;

    const restoredFile = snapshot.file;
    const url = URL.createObjectURL(restoredFile);

    setFile(restoredFile);
    setFileName(snapshot.fileName || restoredFile.name);
    setFileSize(snapshot.fileSize || restoredFile.size);
    setOriginalUrl(url);
    setOrigW(snapshot.origW || 0);
    setOrigH(snapshot.origH || 0);

    if (snapshot.resultBlob) {
      setResultBlob(snapshot.resultBlob);
      setResultUrl(URL.createObjectURL(snapshot.resultBlob));
    } else {
      processFile(restoredFile);
    }

    return true;
  };

  const { sessionRestored, dismissSession, clearSession } = useToolPersistence({
    snapshot: { file, resultBlob, fileName, fileSize, origW, origH },
    hasContent,
    onRestore: handleRestore,
    warnOnUnload: true,
    toolName: 'transparent-background',
  });

  const renderStatus = () => {
    if (processing) {
      return (
        <div className="flex items-center gap-2 text-indigo-500 text-xs font-medium">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Removing background...
        </div>
      );
    }
    if (resultUrl) {
      return (
        <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Background removed successfully
        </div>
      );
    }
    return <p className="text-xs text-slate-400">Waiting to process...</p>;
  };

  if (originalUrl) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-5 md:gap-8 items-start">
        {sessionRestored && (
          <div className="col-span-1 md:col-span-2 flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <p className="text-xs text-indigo-600 font-medium">Previous session restored</p>
            <button
              onClick={dismissSession}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {resultUrl ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{fileName}</p>
                <p className="text-xs text-slate-400 truncate">
                  {origW && origH ? `${origW} × ${origH}` : ''}
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex-shrink-0"
              >
                New image
              </button>
            </div>

            <div
              className="flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            >
              <img
                src={resultUrl}
                alt={fileName}
                className="max-w-full max-h-[260px] sm:max-h-[340px] md:max-h-[420px] rounded-xl shadow-md"
              />
            </div>
          </div>
        ) : (
          <ImageLoader
            fileName={fileName}
            fileSize={fileSize}
            targetFormat="PNG"
            dimensions={origW && origH ? `${origW} × ${origH}` : undefined}
          />
        )}

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-black tracking-widest uppercase text-indigo-500">
                Workspace
              </p>
              <h2 className="text-lg font-bold text-slate-800 mt-0.5">Transparent Background</h2>
            </div>

            <div className="px-4 sm:px-5 py-4 flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Selected File
                </p>
                <p className="text-sm font-semibold text-slate-700 truncate">{fileName}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  How it works
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Our AI model detects the subject in your image and removes the background, leaving
                  a clean transparent PNG ready for use.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Output Format
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    PNG
                  </span>
                  <span className="text-xs text-slate-400">Transparent background</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Processing Status
                </p>
                {renderStatus()}
              </div>

              {error && (
                <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs text-red-500">{error}</p>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={handleDownload}
            disabled={!resultBlob || processing}
          >
            <Download className="w-4 h-4" />
            Download PNG
          </Button>

          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-semibold py-3 rounded-xl transition-colors"
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
    <WorkspaceCard
      toolName="Transparent/Remove Background"
      acceptTypes="image/*"
      allowMultiple={false}
      onFilesChange={handleFilesChange}
      onActionSubmit={handleActionSubmit}
      persistScope="none"
    />
  );
}
