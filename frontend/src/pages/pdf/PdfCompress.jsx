import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { Maximize2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import { PdfPreview, PageModal } from '../../components/toolPreview/PdfPreviewPrimitives';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';
import { compressPdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { clientErrorMessage } from '../../utils/apiError';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

const LEVELS = [
  { value: 0, label: 'None', desc: 'No compression applied' },
  { value: 1, label: 'Low', desc: 'Minimal compression, best quality' },
  { value: 2, label: 'Medium', desc: 'Balanced quality and size' },
  { value: 3, label: 'High', desc: 'Smaller file, some quality loss' },
  { value: 4, label: 'Maximum', desc: 'Smallest file, noticeable loss' },
];

const getLevelStyles = (lvl) => {
  if (lvl === 0)
    return {
      bg: 'bg-slate-50 border-slate-200/60',
      text: 'text-slate-700',
      subText: 'text-slate-500',
      accent: 'accent-slate-600',
      filter: 'none',
      bar: 'bg-slate-400',
    };
  if (lvl === 1)
    return {
      bg: 'bg-blue-50/40 border-blue-100',
      text: 'text-blue-800',
      subText: 'text-blue-600',
      accent: 'accent-blue-500',
      filter: 'contrast(1.01) brightness(1.01)',
      bar: 'bg-blue-400',
    };
  if (lvl === 2)
    return {
      bg: 'bg-blue-50/70 border-blue-100',
      text: 'text-blue-800',
      subText: 'text-blue-600',
      accent: 'accent-blue-600',
      filter: 'contrast(0.98) blur(0.2px)',
      bar: 'bg-blue-500',
    };
  if (lvl === 3)
    return {
      bg: 'bg-orange-50/60 border-orange-100',
      text: 'text-orange-800',
      subText: 'text-orange-600',
      accent: 'accent-orange-500',
      filter: 'contrast(0.92) blur(0.8px)',
      bar: 'bg-orange-400',
    };
  return {
    bg: 'bg-orange-50/90 border-orange-200',
    text: 'text-orange-950',
    subText: 'text-orange-700',
    accent: 'accent-orange-700',
    filter: 'contrast(0.85) blur(1.8px)',
    bar: 'bg-orange-600',
  };
};

export default function PdfCompress({ toolName }) {
  const [error, setError] = useState('');
  const [level, setLevel] = useState(2);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [allPages, setAllPages] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [viewResult, setViewResult] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [modalPage, setModalPage] = useState(null);

  const replaceInputRef = useRef(null);

  useToolPersistence({
    namespace: 'pdf-compress',
    warnOnUnload: true,
    snapshot: { file: pdfFile, level, resultBlob },
    hasContent: Boolean(pdfFile) || Boolean(resultBlob),
    onRestore: (s) => {
      if (!s.file) return;
      loadFile(s.file);
      if (typeof s.level === 'number') setLevel(s.level);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  useEffect(() => {
    if (!pdfDoc) {
      Promise.resolve().then(() => {
        setAllPages([]);
      });
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setLoadingPreview(true);
        setAllPages([]);
      }
    }, 0);

    const renderAll = async () => {
      try {
        const total = pdfDoc.numPages;
        for (let i = 1; i <= total; i++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          if (!cancelled) {
            setAllPages((prev) => [...prev, { pageNum: i, src: canvas.toDataURL() }]);
          }
        }
      } catch {
        // preview rendering is best-effort
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };

    renderAll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pdfDoc]);

  const loadFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }
    try {
      validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }
    setError('');
    setResultBlob(null);
    setViewResult(false);
    setPdfFile(file);
    try {
      const ab = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: ab }).promise;
      setPdfDoc(doc);
    } catch {
      setError('Failed to parse the uploaded PDF.');
    }
  };

  const handleFiles = (newFiles) => loadFile(newFiles?.[0] ?? null);

  const handleReplaceChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    resetFileInput(e);
  };

  const handleClearFile = () => {
    setPdfFile(null);
    setPdfDoc(null);
    setAllPages([]);
    setLevel(2);
    setError('');
    setResultBlob(null);
    setViewResult(false);
    setExpanded(false);
  };

  const handleLevelChange = (nextLevel) => {
    setLevel(nextLevel);
    setResultBlob(null);
    setViewResult(false);
  };

  const handleApply = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF first.');
      return;
    }
    setIsProcessing(true);
    setError('');
    setResultBlob(null);
    setViewResult(false);
    try {
      const blob = await compressPdf({ file: pdfFile, compressionLevel: level });
      if (blob instanceof Blob || blob instanceof File) {
        setResultBlob(blob);
      } else if (blob) {
        const wrapped = new Blob([blob], { type: 'application/pdf' });
        setResultBlob(wrapped);
      } else {
        setError('No file returned from server.');
      }
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !pdfFile) return;
    downloadBlob(resultBlob, `${stripFileExtension(pdfFile.name)}_compressed.pdf`);
  };

  const currentStyle = getLevelStyles(level);
  const selected = LEVELS[level];
  const totalPages = pdfDoc?.numPages ?? 0;
  const skeletonCount = totalPages - allPages.length;

  let previewBody;
  if (viewResult && resultBlob) {
    previewBody = <PdfPreview file={resultBlob} />;
  } else if (loadingPreview && allPages.length === 0) {
    previewBody = (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs font-bold text-slate-400">Rendering pages...</p>
      </div>
    );
  } else {
    previewBody = (
      <div className="space-y-2">
        <div
          className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-0.5"
          style={{ maxHeight: '640px' }}
        >
          {(expanded || allPages.length <= 2 ? allPages : allPages.slice(0, 2)).map(
            ({ pageNum, src }) => (
              <div key={pageNum} className="flex flex-col items-center gap-1.5">
                <div
                  className="relative group w-full bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden"
                  style={{ aspectRatio: '1 / 1.414' }}
                >
                  <img
                    src={src}
                    alt={`Page ${pageNum}`}
                    className="w-full h-full object-contain transition-all duration-300"
                    style={{ filter: currentStyle.filter }}
                    draggable={false}
                  />
                  <button
                    type="button"
                    onClick={() => setModalPage(pageNum)}
                    className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-slate-800/70 hover:bg-slate-900 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Full view"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Page {pageNum}
                </span>
              </div>
            )
          )}

          {loadingPreview &&
            Array.from({ length: skeletonCount }, (_, i) => {
              const skeletonPageNum = allPages.length + i + 1;
              return (
                <div
                  key={`skeleton-page-${skeletonPageNum}`}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl animate-pulse flex items-center justify-center"
                    style={{ aspectRatio: '1 / 1.414' }}
                  >
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-400 rounded-full animate-spin" />
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Page {skeletonPageNum}
                  </span>
                </div>
              );
            })}
        </div>
        {!loadingPreview && allPages.length > 2 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              {expanded ? 'Show less' : `Show all ${allPages.length} pages`}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'Compress PDF Size'}
      subtitle="Reduce the file size of your PDF"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!pdfFile}
        isProcessing={isProcessing}
        preview={
          <Card
            padding="lg"
            className={`${TOOL_LAYOUT.previewPanel} min-h-[420px] lg:min-h-[600px]`}
          >
            {!pdfFile ? (
              <PreviewPanelUpload
                labels={LABELS}
                accept=".pdf"
                multiple={false}
                onFiles={handleFiles}
                uploadTitle="Drag & drop your PDF"
                uploadSubtitle="Accepted: PDF only · Max file size: 50 MB"
              />
            ) : (
              <div className="flex flex-col gap-3 flex-1 w-full min-h-[45vh] max-h-fit">
                <PreviewPanelHeader
                  statusLabel={`${totalPages} ${totalPages === 1 ? 'page' : 'pages'} · ${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`}
                  fileName={pdfFile.name}
                  labels={LABELS}
                  isProcessing={isProcessing}
                  replaceInputRef={replaceInputRef}
                  onReplaceChange={handleReplaceChange}
                  onOpenReplace={() => replaceInputRef.current?.click()}
                  onClearFile={handleClearFile}
                  accept=".pdf"
                />

                {isProcessing ? (
                  <PdfLoader
                    fileName={pdfFile.name}
                    operationLabel="Compressing PDF"
                    totalPages={totalPages}
                  />
                ) : (
                  previewBody
                )}

                {!loadingPreview && !viewResult && level > 1 && (
                  <p className="text-[10px] text-slate-400 font-medium text-center pt-1">
                    Preview reflects approximate compression effect
                  </p>
                )}

                {resultBlob && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100 shrink-0">
                    <CompareToggle
                      showOriginal={!viewResult}
                      onSelectView={(isOriginal) => setViewResult(!isOriginal)}
                      labels={{ beforeLabel: 'Editor', afterLabel: 'Result' }}
                      disabled={isProcessing}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Compress PDF"
            applyingLabel="Compressing..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Compression Level
                </span>
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 ${currentStyle.text}`}
                >
                  {selected.label} · {level}/4
                </span>
              </div>

              <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
                {LEVELS.map((l) => (
                  <div
                    key={l.value}
                    className={`flex-1 rounded-full transition-all duration-300 ${l.value <= level ? currentStyle.bar : 'bg-slate-100'}`}
                  />
                ))}
              </div>

              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={level}
                onChange={(e) => handleLevelChange(Number(e.target.value))}
                className={`w-full h-2 rounded-lg cursor-pointer bg-slate-100 ${currentStyle.accent}`}
              />

              <div className="grid grid-cols-5 text-center">
                {LEVELS.map((l) => (
                  <button
                    type="button"
                    key={l.value}
                    onClick={() => handleLevelChange(l.value)}
                    className={`text-[10px] font-black transition-all focus:outline-none px-0.5 ${
                      level === l.value
                        ? `${currentStyle.text} scale-110`
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`rounded-2xl px-4 py-3.5 border flex items-start gap-3 transition-all duration-300 mt-4 ${currentStyle.bg}`}
            >
              <div>
                <p className={`text-xs font-black uppercase tracking-wider ${currentStyle.text}`}>
                  {selected.label} Profile Active
                </p>
                <p className={`text-xs font-medium mt-0.5 ${currentStyle.subText}`}>
                  {selected.desc}
                </p>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mt-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
                Note
              </p>
              <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed">
                Higher compression reduces image quality. Original file is never modified.
              </p>
            </div>
          </OptionsPanel>
        }
      />
      {modalPage && (
        <PageModal pdfDoc={pdfDoc} pageNum={modalPage} onClose={() => setModalPage(null)} />
      )}
    </ToolPageLayout>
  );
}

PdfCompress.propTypes = {
  toolName: PropTypes.string,
};
