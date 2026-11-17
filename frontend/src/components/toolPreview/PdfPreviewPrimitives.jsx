import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import { FILE_VISUAL, TAB_HEX } from '../../constants/previewConstants';
import { detectFileType } from '../../utils/detectFileType';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileCard({ file, fileType }) {
  const v = FILE_VISUAL[fileType] ?? FILE_VISUAL.generic;
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4">
      {/* Big file icon */}
      <div
        className={`relative w-24 h-28 rounded-2xl border-2 ${v.border} ${v.bg} flex flex-col items-center justify-center shadow-sm`}
      >
        {/* Folded corner */}
        <div
          className={`absolute top-0 right-0 w-6 h-6 ${v.bg} border-b-2 border-l-2 ${v.border} rounded-bl-lg`}
        />
        <span className={`text-2xl font-black ${v.color} mt-2`}>{v.ext}</span>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 max-w-[200px] truncate">{file.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {v.label} · {formatSize(file.size)}
        </p>
      </div>
      <p className="text-[10px] text-slate-300">No visual preview available</p>
    </div>
  );
}

FileCard.propTypes = {
  file: PropTypes.object.isRequired,
  fileType: PropTypes.string,
};

export function PageModal({ pdfDoc, pageNum, onClose, previewOverlay }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!pdfDoc || !pageNum) return;
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Page {pageNum}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
          >
            <svg fill="none" viewBox="0 0 16 16" className="w-4 h-4">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-auto flex-1 flex items-start justify-center p-4 bg-slate-50">
          <div className="relative inline-block">
            <canvas ref={canvasRef} className="rounded-lg shadow-md max-w-full" />
            {previewOverlay && (
              <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                {previewOverlay}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

PageModal.propTypes = {
  pdfDoc: PropTypes.object,
  pageNum: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  previewOverlay: PropTypes.node,
};

function PageThumb({
  pdfDoc,
  pageNum,
  isSelected,
  isClickable,
  onSelect,
  onPreview,
  previewOverlay,
}) {
  const canvasRef = useRef();
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    (async () => {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum]);

  const isDeselecting = isSelected && hovered && isClickable;
  let thumbBorderClass = 'border-slate-200 hover:border-blue-300 hover:bg-slate-50';
  if (isDeselecting) {
    thumbBorderClass = 'border-rose-400 bg-rose-50';
  } else if (isSelected) {
    thumbBorderClass = 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100';
  }
  let pageLabelClass = 'text-slate-400';
  if (isDeselecting) {
    pageLabelClass = 'text-rose-400';
  } else if (isSelected) {
    pageLabelClass = 'text-blue-500';
  }

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        onClick={isClickable ? onSelect : onPreview}
        className={`relative rounded-lg border-2 p-1 transition-all cursor-pointer ${thumbBorderClass}`}
      >
        <canvas ref={canvasRef} className="rounded block" />

        {previewOverlay && (
          <div className="absolute inset-0 pointer-events-none rounded overflow-hidden">
            {previewOverlay}
          </div>
        )}

        {isSelected && (
          <span
            className={`absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${isDeselecting ? 'bg-rose-400' : 'bg-blue-500'}`}
          >
            {isDeselecting ? (
              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                <path
                  d="M2 2l4 4M6 2L2 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                <path
                  d="M1.5 4L3 5.5L6.5 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
        )}
        {hovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="absolute bottom-0.5 right-0.5 w-5 h-5 bg-slate-800/70 hover:bg-slate-900 rounded-md flex items-center justify-center"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
              <path
                d="M7.5 1.5H10.5V4.5M10.5 1.5L7 5M4.5 10.5H1.5V7.5M1.5 10.5L5 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      <span className={`text-[10px] mt-1 font-medium ${pageLabelClass}`}>{pageNum}</span>
    </div>
  );
}

export function PdfPreview({
  file,
  selectedPages,
  onPageClick,
  highlightRanges,
  previewOverlay,
  overlayPageRange,
}) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [modalPage, setModalPage] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPdfDoc(null);
    setLoadError(false);
    (async () => {
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setExpanded(false);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const isPageHighlighted = (p) => {
    if (selectedPages?.has(p)) return true;
    return highlightRanges?.some((r) => p >= r.from && p <= r.to) ?? false;
  };

  const shouldShowOverlay = (p) => {
    if (!previewOverlay) return false;
    const from = overlayPageRange?.from ?? 1;
    const to = overlayPageRange?.to ?? 1;
    return p >= from && p <= to;
  };

  const closeModal = useCallback(() => setModalPage(null), []);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[180px] gap-3 text-slate-400">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 40 40">
          <rect x="6" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 12h14M10 17h14M10 22h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs font-semibold text-center px-4">
          Preview unavailable — this PDF is password-protected or could not be read.
        </span>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[180px] gap-3 text-slate-300">
        <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 40 40">
          <rect x="6" y="4" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 12h14M10 17h14M10 22h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-xs">Loading preview…</span>
      </div>
    );
  }

  const selectedCount = selectedPages?.size ?? 0;
  const isClickable = !!onPageClick;
  const allPageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const canCollapse = totalPages > 2;
  const visiblePages = expanded || !canCollapse ? allPageNumbers : allPageNumbers.slice(0, 2);
  const pageWordSuffix = selectedCount !== 1 ? 's' : '';
  const selectionStatusText =
    selectedCount > 0 ? `${selectedCount} page${pageWordSuffix} selected` : 'No pages selected';

  return (
    <>
      <div className="flex flex-col gap-2 h-full min-h-0">
        <div className="flex items-center justify-between px-0.5 flex-shrink-0">
          <p className="text-xs font-semibold text-slate-500">
            {isClickable ? 'Click to select · hover for full view' : 'Hover pages for full view'}
          </p>
          <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="flex flex-wrap gap-2">
            {visiblePages.map((p) => (
              <PageThumb
                key={p}
                pdfDoc={pdfDoc}
                pageNum={p}
                isSelected={isPageHighlighted(p)}
                isClickable={isClickable}
                onSelect={() => onPageClick?.(p)}
                onPreview={() => setModalPage(p)}
                previewOverlay={shouldShowOverlay(p) ? previewOverlay : null}
              />
            ))}
          </div>
          {canCollapse && (
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
              >
                {expanded ? 'Show less' : `Show all ${totalPages} pages`}
              </button>
            </div>
          )}
        </div>
        {isClickable && (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${selectedCount > 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
            />
            <p
              className={`text-[10px] font-medium ${selectedCount > 0 ? 'text-blue-500' : 'text-slate-300'}`}
            >
              {selectionStatusText}
            </p>
          </div>
        )}
      </div>
      {modalPage && (
        <PageModal
          pdfDoc={pdfDoc}
          pageNum={modalPage}
          onClose={closeModal}
          previewOverlay={shouldShowOverlay(modalPage) ? previewOverlay : null}
        />
      )}
    </>
  );
}

PdfPreview.propTypes = {
  file: PropTypes.object,
  selectedPages: PropTypes.instanceOf(Set),
  onPageClick: PropTypes.func,
  highlightRanges: PropTypes.arrayOf(
    PropTypes.shape({ from: PropTypes.number, to: PropTypes.number })
  ),
  previewOverlay: PropTypes.node,
  overlayPageRange: PropTypes.shape({ from: PropTypes.number, to: PropTypes.number }),
};

export function ImagePreview({ file }) {
  const [src, setSrc] = useState(null);

  useLayoutEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!src) return null;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-semibold text-slate-500">Preview</p>
        <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 truncate max-w-[140px]">
          {file.name}
        </span>
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-3">
        <img
          src={src}
          alt="Preview"
          className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
        />
      </div>
    </div>
  );
}

ImagePreview.propTypes = {
  file: PropTypes.object,
};

export function FileTabs({ files, activeIndex, onSelect, onRemove = null, disabled = false }) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto flex-shrink-0 flex-nowrap mb-2"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {files.map((f, i) => {
        const type = detectFileType(f);
        const v = FILE_VISUAL[type] ?? FILE_VISUAL.generic;
        const hex = TAB_HEX[type] ?? TAB_HEX.generic;
        const isActive = activeIndex === i;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(i)}
            style={
              isActive
                ? {
                    backgroundColor: hex,
                    borderColor: hex,
                    color: '#fff',
                    boxShadow: `0 2px 8px ${hex}55`,
                  }
                : { backgroundColor: '#fff', borderColor: hex, color: hex }
            }
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              style={
                isActive
                  ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
                  : { backgroundColor: hex + '18', color: hex }
              }
              className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
            >
              {v.ext}
            </span>
            <span className="truncate max-w-[90px]">{f.name}</span>
            {onRemove && files.length > 1 && (
              <span
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={(e) => {
                  if (disabled) return;
                  e.stopPropagation();
                  onRemove(i);
                }}
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onRemove(i);
                  }
                }}
                className="ml-0.5 -mr-1 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-black/10"
                aria-label={`Remove ${f.name}`}
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 8 8">
                  <path
                    d="M1.5 1.5l5 5M6.5 1.5l-5 5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

FileTabs.propTypes = {
  files: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  disabled: PropTypes.bool,
};
