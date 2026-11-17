import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import PdfLoader from '../../components/loaders/PdfLoader';
import { PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import { replaceTextPdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

function PdfPreviewPanel({ file, matches, currentIndex, replaceText }) {
  const canvasRef = useRef();
  const containerRef = useRef();
  const textMeasurerRef = useRef();

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [viewports, setViewports] = useState({});
  const [textScaleX, setTextScaleX] = useState(1);

  const [prevFile, setPrevFile] = useState(file);
  if (file !== prevFile) {
    setPrevFile(file);
    setPdfDoc(null);
    setTotalPages(0);
    setViewports({});
  }

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    (async () => {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setPageNum(1);
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const targetMatchPage = matches[currentIndex]?.page ?? null;
  const [prevTargetMatchPage, setPrevTargetMatchPage] = useState(targetMatchPage);
  if (targetMatchPage !== prevTargetMatchPage) {
    setPrevTargetMatchPage(targetMatchPage);
    if (targetMatchPage !== null) {
      setPageNum(targetMatchPage);
    }
  }

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    let renderTask = null;

    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const vp1 = page.getViewport({ scale: 1 });
      const cw = containerRef.current?.clientWidth ?? 600;
      const fit = Math.max(Math.min((cw - 48) / vp1.width, 2.2), 0.4);
      const vp = page.getViewport({ scale: fit });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = vp.width;
      canvas.height = vp.height;
      setCanvasSize({ w: vp.width, h: vp.height });

      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp });
      try {
        await renderTask.promise;
      } catch (e) {
        if (e?.name === 'RenderingCancelledException') return;
      }

      if (cancelled) return;
      setViewports((prev) => ({ ...prev, [pageNum]: vp }));
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDoc, pageNum]);

  const pageMatches = matches.filter((m) => m.page === pageNum);
  const activeMatch = matches[currentIndex];
  const isActivePage = activeMatch?.page === pageNum;
  const currentViewport = viewports[pageNum];

  const renderedMatches = currentViewport
    ? pageMatches.map((m) => {
        const item = m.item;
        const [a, b, c, d, tx, ty] = item.transform;

        const charCount = item.str.length;
        const charPdfW = item.width > 0 ? item.width / charCount : Math.hypot(a, b);
        const pdfHeight = Math.hypot(c, d);

        const matchStartX = tx + charPdfW * m.matchIndex;
        const matchEndX = matchStartX + charPdfW * m.matchLength;

        const [x1, y1] = currentViewport.convertToViewportPoint(matchStartX, ty + pdfHeight);
        const [x2, y2] = currentViewport.convertToViewportPoint(matchEndX, ty);

        let fallbackFont = 'sans-serif';
        const lowerFont = (item.fontName || '').toLowerCase();
        if (
          lowerFont.includes('serif') ||
          lowerFont.includes('times') ||
          lowerFont.includes('georgia')
        ) {
          fallbackFont = 'Georgia, "Times New Roman", serif';
        } else if (
          lowerFont.includes('mono') ||
          lowerFont.includes('courier') ||
          lowerFont.includes('consolas')
        ) {
          fallbackFont = 'monospace';
        } else if (lowerFont.includes('helvetica') || lowerFont.includes('arial')) {
          fallbackFont = 'Arial, Helvetica, sans-serif';
        }

        return {
          globalIdx: matches.indexOf(m),
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          w: Math.abs(x2 - x1),
          h: Math.abs(y2 - y1),
          fontSize: pdfHeight * currentViewport.scale,
          fontFamily: fallbackFont,
        };
      })
    : [];

  const activeRenderedMatch = renderedMatches.find((m) => m.globalIdx === currentIndex);
  const activeW = activeRenderedMatch?.w;
  const activeFontSize = activeRenderedMatch?.fontSize;
  const activeFontFamily = activeRenderedMatch?.fontFamily;

  useEffect(() => {
    const measurer = textMeasurerRef.current;
    if (activeW === undefined || !replaceText || !measurer) {
      setTextScaleX(1);
      return;
    }
    measurer.style.fontSize = `${activeFontSize}px`;
    measurer.style.fontFamily = activeFontFamily;
    const naturalWidth = measurer.getBoundingClientRect().width;
    setTextScaleX(naturalWidth > 0 ? activeW / naturalWidth : 1);
  }, [activeW, activeFontSize, activeFontFamily, replaceText]);

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[500px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 gap-4">
        <svg className="w-14 h-14 text-slate-200" fill="none" viewBox="0 0 56 56">
          <rect x="8" y="6" width="32" height="40" rx="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M14 18h20M14 25h20M14 32h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-400">No file uploaded yet</p>
          <p className="text-xs text-slate-300 mt-1">Upload a PDF to see preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        ref={textMeasurerRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',
          whiteSpace: 'nowrap',
          fontWeight: 'normal',
        }}
      >
        {replaceText}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-500">Preview</span>
        <div className="flex items-center gap-2">
          {replaceText && isActivePage && (
            <span className="text-[10px] bg-blue-50 text-blue-500 font-semibold px-2 py-0.5 rounded-full">
              Live preview
            </span>
          )}
          {pageMatches.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              {pageMatches.length} match{pageMatches.length !== 1 ? 'es' : ''} on page {pageNum}
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-100 flex justify-center items-start p-5"
      >
        <div
          className="relative shadow-lg bg-white"
          style={{ width: canvasSize.w, height: canvasSize.h, flexShrink: 0 }}
        >
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />

          <svg
            width={canvasSize.w}
            height={canvasSize.h}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
          >
            {renderedMatches.map((rm) => {
              const isActive = rm.globalIdx === currentIndex;
              return (
                <g key={rm.globalIdx}>
                  {isActive && replaceText !== undefined && replaceText !== '' && (
                    <rect
                      x={rm.x - 0.5}
                      y={rm.y - 0.5}
                      width={rm.w + 1}
                      height={rm.h + 1}
                      fill="white"
                    />
                  )}
                  <rect
                    x={rm.x - 2}
                    y={rm.y - 2}
                    width={rm.w + 4}
                    height={rm.h + 4}
                    fill={isActive ? 'rgba(251,191,36,0.35)' : 'rgba(251,191,36,0.12)'}
                    stroke={isActive ? '#f59e0b' : '#fcd34d'}
                    strokeWidth={isActive ? 1.5 : 1}
                    rx="1"
                  />
                </g>
              );
            })}
          </svg>

          {isActivePage && replaceText && activeRenderedMatch && (
            <div
              style={{
                position: 'absolute',
                left: activeRenderedMatch.x,
                top: activeRenderedMatch.y,
                width: activeRenderedMatch.w,
                height: activeRenderedMatch.h,
                fontSize: `${activeRenderedMatch.fontSize}px`,
                fontFamily: activeRenderedMatch.fontFamily,
                fontWeight: 'normal',
                color: '#000000',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                background: 'rgba(219,234,254,0.75)',
                transformOrigin: 'left center',
                transform: `scaleX(${textScaleX})`,
                overflow: 'visible',
              }}
            >
              {replaceText}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2.5 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum === 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 8 12">
              <path
                d="M6 1L2 6l4 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="text-xs text-slate-500 font-medium">
            {pageNum} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))}
            disabled={pageNum === totalPages}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 8 12">
              <path
                d="M2 1l4 5-4 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReplaceTextPdf({ toolName }) {
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState('');
  const [replace, setReplace] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [viewResult, setViewResult] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);
  const replaceInputRef = useRef(null);

  useToolPersistence({
    snapshot: { file, search, replace, resultBlob, resultName },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (typeof s.search === 'string') setSearch(s.search);
      if (typeof s.replace === 'string') setReplace(s.replace);
      if (s.resultBlob) setResultBlob(s.resultBlob);
      if (typeof s.resultName === 'string') setResultName(s.resultName);
    },
  });

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files (.pdf) are accepted.');
      return;
    }
    try {
      validateFile(f, { maxSizeMB: PDF_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }
    setFile(f);
    setMatches([]);
    setCurrentIndex(0);
    setResultBlob(null);
    setViewResult(false);
    setError('');
  };

  const handleFiles = (newFiles) => {
    if (newFiles?.length) handleFile(newFiles[0]);
  };

  const handleReplaceChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    resetFileInput(e);
  };

  const handleClear = () => {
    setFile(null);
    setMatches([]);
    setCurrentIndex(0);
    setSearch('');
    setReplace('');
    setResultBlob(null);
    setViewResult(false);
    setError('');
  };

  const searchActive = Boolean(file && search.trim());
  const [prevSearchActive, setPrevSearchActive] = useState(searchActive);
  if (searchActive !== prevSearchActive) {
    setPrevSearchActive(searchActive);
    if (!searchActive) {
      setMatches([]);
      setCurrentIndex(0);
    }
  }

  useEffect(() => {
    if (!searchActive) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const found = [];
        const term = search.toLowerCase();

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();

          for (const item of content.items) {
            if (!item.str?.trim()) continue;

            const str = item.str;
            const lower = str.toLowerCase();

            let idx = lower.indexOf(term);
            while (idx !== -1) {
              found.push({
                page: p,
                item: item,
                matchIndex: idx,
                matchLength: term.length,
              });
              idx = lower.indexOf(term, idx + 1);
            }
          }
        }

        setMatches(found);
        setCurrentIndex(0);
      } catch (e) {
        console.error(e);
        setMatches([]);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [file, search, searchActive]);

  const navigate = (dir) => {
    if (!matches.length) return;
    setCurrentIndex((prev) =>
      dir === 'next' ? (prev + 1) % matches.length : (prev - 1 + matches.length) % matches.length
    );
  };

  const handleProcess = async (mode) => {
    if (!file || !search.trim()) return;
    setIsProcessing(true);
    setError('');
    setResultBlob(null);
    setViewResult(false);
    try {
      const data = await replaceTextPdf({
        file,
        searchText: search,
        replaceText: replace,
        mode,
        matchIndex: currentIndex,
      });
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
      setResultBlob(blob);
      setResultName(stripFileExtension(file.name) + '_replaced');
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const affectedPages = new Set(matches.map((m) => m.page)).size;
  const matchLabel = matches.length === 1 ? 'match' : 'matches';
  const pageLabel = affectedPages === 1 ? 'page' : 'pages';
  const previewStatusLabel = search.trim()
    ? `${matches.length} ${matchLabel} on ${affectedPages} ${pageLabel}`
    : 'Ready';

  let previewBody;
  if (isProcessing) {
    previewBody = <PdfLoader fileName={file?.name ?? ''} operationLabel="Replacing Text" />;
  } else if (viewResult && resultBlob) {
    previewBody = <PdfPreview file={resultBlob} />;
  } else {
    previewBody = (
      <PdfPreviewPanel
        file={file}
        matches={matches}
        currentIndex={currentIndex}
        replaceText={replace}
      />
    );
  }

  return (
    <ToolPageLayout title={toolName} subtitle="Find and replace text inside your PDF" error={error}>
      <ToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <Card
            padding="lg"
            className={`${TOOL_LAYOUT.previewPanel} min-h-[420px] lg:min-h-[600px]`}
          >
            {!file ? (
              <PreviewPanelUpload
                labels={LABELS}
                accept=".pdf"
                multiple={false}
                onFiles={handleFiles}
                uploadTitle="Drag & drop your PDF"
                uploadSubtitle="Find and replace text inside your PDF"
              />
            ) : (
              <div className="flex flex-col gap-3 flex-1 w-full min-h-[45vh] max-h-fit">
                <PreviewPanelHeader
                  statusLabel={previewStatusLabel}
                  fileName={file.name}
                  labels={LABELS}
                  isProcessing={isProcessing}
                  replaceInputRef={replaceInputRef}
                  onReplaceChange={handleReplaceChange}
                  onOpenReplace={() => replaceInputRef.current?.click()}
                  onClearFile={handleClear}
                  accept=".pdf"
                />
                {previewBody}
                {resultBlob && !isProcessing && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100 shrink-0">
                    <CompareToggle
                      showOriginal={!viewResult}
                      onSelectView={(isOriginal) => setViewResult(!isOriginal)}
                      labels={{ beforeLabel: 'Before', afterLabel: 'After' }}
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
            showApply={false}
            completeMessage={resultBlob ? `Done! Ready to download: ${resultName}.pdf` : ''}
            footer={
              resultBlob && (
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  className="mt-4"
                  onClick={() => downloadBlob(resultBlob, `${resultName}.pdf`)}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )
            }
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Find & Replace</p>
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  <div className="flex items-center px-3 py-2.5 gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-slate-300 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M11 11l3 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setResultBlob(null);
                        setViewResult(false);
                      }}
                      placeholder="Find text…"
                      className="flex-1 text-sm text-slate-700 placeholder-slate-300 focus:outline-none bg-transparent"
                    />
                    {search.trim() && (
                      <span
                        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                          matches.length === 0
                            ? 'bg-rose-50 text-rose-400'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {matches.length === 0
                          ? 'No results'
                          : `${currentIndex + 1} / ${matches.length}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center px-3 py-2.5 gap-2">
                    <svg
                      className="w-3.5 h-3.5 text-slate-300 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        d="M2 5h9M2 5l2.5-2.5M2 5l2.5 2.5M14 11H5M14 11l-2.5-2.5M14 11l-2.5 2.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <input
                      type="text"
                      value={replace}
                      onChange={(e) => {
                        setReplace(e.target.value);
                        setResultBlob(null);
                        setViewResult(false);
                      }}
                      placeholder="Replace with…"
                      className="flex-1 text-sm text-slate-700 placeholder-slate-300 focus:outline-none bg-transparent"
                    />
                    {replace && search.trim() && matches.length > 0 && (
                      <span className="text-[10px] text-blue-400 font-medium flex-shrink-0">
                        live ↗
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {search.trim() && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate('prev')}
                      disabled={matches.length === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                      title="Previous match"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                        <path
                          d="M10 12L6 8l4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('next')}
                      disabled={matches.length === 0}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
                      title="Next match"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                        <path
                          d="M6 12l4-4-4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  {matches.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      <span className="text-[11px] text-slate-500 font-medium">
                        {matches.length} match{matches.length !== 1 ? 'es' : ''} · {affectedPages}{' '}
                        page{affectedPages !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleProcess('single')}
                  disabled={!file || !search.trim() || matches.length === 0 || isProcessing}
                  className="w-full py-2.5 rounded-xl border-2 border-blue-500 text-blue-600 text-sm font-bold hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Replace Instance {matches.length > 0 ? currentIndex + 1 : ''}
                </button>
                <button
                  type="button"
                  onClick={() => handleProcess('all')}
                  disabled={!file || !search.trim() || matches.length === 0 || isProcessing}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 16 16">
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="28"
                          strokeDashoffset="10"
                        />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    <>Replace All{matches.length > 0 ? ` (${matches.length})` : ''}</>
                  )}
                </button>
              </div>
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}
