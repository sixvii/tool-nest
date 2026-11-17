import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { FileText, X, Maximize2 } from 'lucide-react';
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
import { downloadBlob, makeId, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { rearrangePdf } from '../../services/pdfService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

function processDashMatch(dashMatch, pageCount, result) {
  const a = Number.parseInt(dashMatch[1], 10);
  const b = Number.parseInt(dashMatch[2], 10);

  if (Number.isNaN(a) || Number.isNaN(b)) return;

  if (a > b) {
    for (let i = a; i >= b; i--) {
      if (i >= 1 && i <= pageCount && !result.includes(i)) {
        result.push(i);
      }
    }
  } else {
    for (let i = a; i <= b; i++) {
      if (i >= 1 && i <= pageCount && !result.includes(i)) {
        result.push(i);
      }
    }
  }
}

function parseRangeWithOrder(rangeStr, pageCount) {
  const result = [];
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashMatch) {
      processDashMatch(dashMatch, pageCount, result);
    } else {
      const n = Number.parseInt(trimmed, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= pageCount && !result.includes(n)) {
        result.push(n);
      }
    }
  }
  return result;
}

function validatePart(trimmed, pageCount) {
  const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  const singleMatch = trimmed.match(/^(\d+)$/);

  if (!dashMatch && !singleMatch) {
    return `Invalid format: "${trimmed}". Use e.g. 5-3, 1, 2`;
  }

  if (dashMatch) {
    const a = Number.parseInt(dashMatch[1], 10);
    const b = Number.parseInt(dashMatch[2], 10);
    if (a < 1 || b < 1 || a > pageCount || b > pageCount) {
      return `Page numbers must be between 1 and ${pageCount}.`;
    }
  }

  if (singleMatch) {
    const n = Number.parseInt(singleMatch[1], 10);
    if (n < 1 || n > pageCount) {
      return `Page ${n} doesn't exist. PDF has ${pageCount} pages.`;
    }
  }

  return '';
}

function validateRangeStr(rangeStr, pageCount) {
  if (!rangeStr.trim()) return 'Please enter a page range.';

  const parts = rangeStr.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const error = validatePart(trimmed, pageCount);
    if (error) return error;
  }

  return '';
}

function PageThumbnail({
  pageNumber,
  pdfDoc,
  index,
  isDragging,
  onRemove,
  onPointerDown,
  onPreview,
}) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const render = async () => {
      try {
        if (!pdfDoc || !pageNumber) return;
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 2.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (isMounted) {
          setThumbnail(canvas.toDataURL());
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    };
    render();
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div
      onPointerDown={onPointerDown}
      style={{ touchAction: 'none', userSelect: 'none' }}
      className={`relative group transition-all w-full max-w-xs mx-auto cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02]'}`}
    >
      <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all flex items-center justify-center border-2 border-blue-400 ring-2 ring-blue-200 bg-blue-50">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${index + 1}`}
            draggable={false}
            className="w-full h-full object-contain bg-white pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            {loading ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-12 h-12 text-slate-300" />
            )}
          </div>
        )}
      </div>

      <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 border-white shadow-lg bg-blue-600 text-white">
        {index + 1}
      </div>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        title="Remove this page"
        className="absolute -top-3 -left-3 w-9 h-9 bg-red-500 text-white rounded-full flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 border-2 border-white z-10"
      >
        <X className="w-5 h-5" strokeWidth={3} />
      </button>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        title="Full view"
        className="absolute bottom-2 right-2 w-7 h-7 bg-slate-800/70 hover:bg-slate-900 text-white rounded-md flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      <p className="text-center text-xs font-semibold text-slate-500 mt-2">Page {index + 1}</p>
    </div>
  );
}

PageThumbnail.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  pdfDoc: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isDragging: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
  onPointerDown: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
};

export default function PdfRearrangeDelete({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedPages, setSelectedPages] = useState([]);
  const [downloadableResult, setDownloadableResult] = useState(null);
  const [viewResult, setViewResult] = useState(false);
  const [modalPage, setModalPage] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const [rangeInputStr, setRangeInputStr] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [rangeApplied, setRangeApplied] = useState(false);
  const [justReversed, setJustReversed] = useState(false);

  const replaceInputRef = useRef(null);

  const dragState = useRef({
    active: false,
    fromIndex: null,
    clone: null,
    offsetX: 0,
    offsetY: 0,
  });
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const cardRefs = useRef([]);

  useToolPersistence({
    namespace: 'pdf-rearrange',
    warnOnUnload: true,
    snapshot: { file: pdfFile, selectedPages, downloadableResult },
    hasContent: Boolean(pdfFile) || Boolean(downloadableResult),
    onRestore: async (s) => {
      if (!s.file) return;
      setPdfFile(s.file);
      if (Array.isArray(s.selectedPages)) setSelectedPages(s.selectedPages);
      if (s.downloadableResult) setDownloadableResult(s.downloadableResult);
      try {
        const arrayBuffer = await s.file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(doc);
      } catch (err) {
        console.error('PdfRearrangeDelete: failed to restore PDF preview', err);
        setError('Failed to load PDF preview. Please try another file.');
      }
    },
  });

  const handlePointerMove = (e) => {
    const ds = dragState.current;
    if (!ds.active || !ds.clone) return;

    ds.clone.style.left = `${e.clientX - ds.offsetX}px`;
    ds.clone.style.top = `${e.clientY - ds.offsetY}px`;

    ds.clone.style.display = 'none';
    const elBelow = document.elementFromPoint(e.clientX, e.clientY);
    ds.clone.style.display = '';

    const cardEl = elBelow?.closest('[data-page-index]');
    const idx = cardEl ? Number.parseInt(cardEl.dataset.pageIndex, 10) : null;
    setOverIndex(idx);
  };

  const handlePointerUp = (e) => {
    const ds = dragState.current;
    if (!ds.active) return;

    if (ds.clone) {
      ds.clone.remove();
      ds.clone = null;
    }

    const elBelow = document.elementFromPoint(e.clientX, e.clientY);
    const cardEl = elBelow?.closest('[data-page-index]');
    const toIndex = cardEl ? Number.parseInt(cardEl.dataset.pageIndex, 10) : null;

    if (toIndex !== null && ds.fromIndex !== null && toIndex !== ds.fromIndex) {
      setSelectedPages((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(ds.fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return arr;
      });
      setDownloadableResult(null);
      setViewResult(false);
    }

    dragState.current = { active: false, fromIndex: null, clone: null, offsetX: 0, offsetY: 0 };
    setDraggingIndex(null);
    setOverIndex(null);

    globalThis.removeEventListener('pointermove', handlePointerMove);
    globalThis.removeEventListener('pointerup', handlePointerUp);
    globalThis.removeEventListener('pointercancel', handlePointerUp);
  };

  const handlePointerDown = (e, index) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();

    const el = cardRefs.current[index];
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const clone = el.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.8';
    clone.style.zIndex = '9999';
    clone.style.transform = 'scale(1.05) rotate(1deg)';
    clone.style.boxShadow = '0 16px 40px rgba(0,0,0,0.2)';
    clone.style.borderRadius = '1rem';
    clone.style.transition = 'none';
    document.body.appendChild(clone);

    dragState.current = {
      active: true,
      fromIndex: index,
      clone,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    setDraggingIndex(index);

    globalThis.addEventListener('pointermove', handlePointerMove);
    globalThis.addEventListener('pointerup', handlePointerUp);
    globalThis.addEventListener('pointercancel', handlePointerUp);
  };

  const resetState = () => {
    setDownloadableResult(null);
    setViewResult(false);
    setExpanded(false);
    setError('');
    setSelectedPages([]);
    setDraggingIndex(null);
    setOverIndex(null);
    setRangeInputStr('');
    setRangeError('');
    setRangeApplied(false);
    cardRefs.current = [];
  };

  const validateAndSetFile = async (file) => {
    if (!file) return;
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfExt) {
      setError('Invalid file extension. Please upload a .pdf file.');
      return;
    }
    if (file.size === 0) {
      setError('This file appears to be empty. Please upload a valid PDF.');
      return;
    }
    try {
      validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }
    setError('');
    setPdfFile(file);
    resetState();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);
      setSelectedPages(
        Array.from({ length: doc.numPages }, (_, i) => ({
          id: makeId(),
          pageNum: i + 1,
        }))
      );
    } catch (err) {
      console.error('PdfRearrangeDelete: failed to load PDF preview', err);
      setError('Failed to load PDF preview. Please try another file.');
      setPdfDoc(null);
    }
  };

  const handleFiles = (newFiles) => {
    if (newFiles?.length) validateAndSetFile(newFiles[0]);
  };

  const handleReplaceChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
    resetFileInput(e);
  };

  const handleClearFile = () => {
    setPdfFile(null);
    setPdfDoc(null);
    resetState();
  };

  const handleRangeInputChange = (value) => {
    setRangeInputStr(value);
    setRangeError(value.trim() ? validateRangeStr(value, pdfDoc?.numPages || 0) : '');
  };

  const handleApplyRange = () => {
    if (!rangeInputStr.trim()) {
      setRangeError('Please enter a page range.');
      return;
    }
    const err = validateRangeStr(rangeInputStr, pdfDoc?.numPages || 0);
    if (err) {
      setRangeError(err);
      return;
    }

    const parsedNums = parseRangeWithOrder(rangeInputStr, pdfDoc?.numPages || 0);
    setSelectedPages(parsedNums.map((n) => ({ id: makeId(), pageNum: n })));
    setRangeApplied(true);
    setRangeError('');
    setDownloadableResult(null);
    setViewResult(false);
  };

  const handleClearRange = () => {
    setRangeInputStr('');
    setRangeApplied(false);
    if (pdfDoc) {
      setSelectedPages(
        Array.from({ length: pdfDoc.numPages }, (_, i) => ({
          id: makeId(),
          pageNum: i + 1,
        }))
      );
    }
    setRangeError('');
    setDownloadableResult(null);
    setViewResult(false);
  };

  const handleRemovePage = (index) => {
    setSelectedPages((prev) => prev.filter((_, i) => i !== index));
    setDownloadableResult(null);
    setViewResult(false);
  };

  const handleSelectAll = () => {
    if (pdfDoc) {
      setSelectedPages(
        Array.from({ length: pdfDoc.numPages }, (_, i) => ({
          id: makeId(),
          pageNum: i + 1,
        }))
      );
      setDownloadableResult(null);
      setViewResult(false);
      setRangeApplied(false);
      setRangeInputStr('');
    }
  };

  const handleReverse = () => {
    setSelectedPages((prev) => [...prev].reverse());
    setDownloadableResult(null);
    setViewResult(false);
    setJustReversed(true);
    setTimeout(() => setJustReversed(false), 350);
  };

  const handleApply = async () => {
    if (!pdfFile || selectedPages.length === 0) {
      setError('Please select at least one page.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const pageOrder = selectedPages.map((p) => p.pageNum);
      const blob = await rearrangePdf({ file: pdfFile, pageOrder });
      setDownloadableResult(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadableResult || !pdfFile) return;
    downloadBlob(downloadableResult, stripFileExtension(pdfFile.name) + '_rearranged.pdf');
  };

  let inputClassName =
    'flex-1 min-w-[160px] text-sm px-3 py-2 rounded-xl border transition-all outline-none focus:ring-2 ';
  if (rangeError) {
    inputClassName += 'border-red-300 focus:ring-red-200 bg-red-50';
  } else if (rangeInputStr.trim()) {
    inputClassName += 'border-blue-300 focus:ring-blue-200 bg-blue-50';
  } else {
    inputClassName += 'border-slate-200 focus:ring-blue-100 bg-white';
  }

  let buttonClassName = 'text-xs font-bold px-4 py-2 rounded-xl transition-all border shrink-0 ';
  if (rangeError) {
    buttonClassName += 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200';
  } else {
    buttonClassName += 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600';
  }

  const gridItemClassName = (index) => {
    let base = 'transition-all rounded-2xl ';
    if (draggingIndex === index) {
      base += 'opacity-40';
    } else if (overIndex === index && draggingIndex !== null) {
      base += 'ring-4 ring-blue-400 ring-offset-2 scale-[1.03]';
    }
    return base;
  };

  const getRangeStatusMessage = () => {
    if (rangeError) {
      return <p className="text-xs font-semibold text-red-600">{rangeError}</p>;
    }
    if (rangeApplied) {
      return (
        <p className="text-xs text-green-600 font-medium">
          ✓ Pages arranged! You can still drag to reorder.
        </p>
      );
    }
    return (
      <p className="text-xs text-slate-400">
        Enter pages in desired order:{' '}
        <span className="font-mono font-semibold text-slate-500">5-3, 1, 2</span> = Pages 5, 4, 3,
        1, 2
      </p>
    );
  };

  let rearrangePreviewBody;
  if (viewResult && downloadableResult) {
    rearrangePreviewBody = <PdfPreview file={downloadableResult} />;
  } else if (selectedPages.length === 0) {
    rearrangePreviewBody = (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">No pages selected.</p>
      </div>
    );
  } else {
    rearrangePreviewBody = (
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full overflow-y-auto">
          {(expanded || selectedPages.length <= 2 ? selectedPages : selectedPages.slice(0, 2)).map(
            (pageObj) => {
              const index = selectedPages.findIndex((p) => p.id === pageObj.id);
              return (
                <div
                  key={pageObj.id}
                  data-page-index={index}
                  ref={(el) => (cardRefs.current[index] = el)}
                  className={gridItemClassName(index)}
                >
                  {pdfDoc && (
                    <PageThumbnail
                      pageNumber={pageObj.pageNum}
                      pdfDoc={pdfDoc}
                      index={index}
                      isDragging={draggingIndex === index}
                      onRemove={() => handleRemovePage(index)}
                      onPointerDown={(e) => handlePointerDown(e, index)}
                      onPreview={() => setModalPage(pageObj.pageNum)}
                    />
                  )}
                </div>
              );
            }
          )}
        </div>
        {selectedPages.length > 2 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              {expanded ? 'Show less' : `Show all ${selectedPages.length} pages`}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'Rearrange PDF Pages'}
      subtitle="Drag pages to reorder your PDF"
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
                uploadSubtitle="PDF files only (.pdf) · Max 50 MB"
              />
            ) : (
              <div className="flex flex-col gap-3 flex-1 w-full min-h-[45vh] max-h-fit">
                <PreviewPanelHeader
                  statusLabel={`${selectedPages.length} of ${pdfDoc?.numPages || 0} pages`}
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
                    operationLabel="Rearranging PDF Pages"
                    totalPages={pdfDoc?.numPages ?? 0}
                  />
                ) : (
                  rearrangePreviewBody
                )}

                {downloadableResult && (
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
            hasResult={!!downloadableResult}
            applyLabel={`Generate PDF (${selectedPages.length})`}
            applyingLabel="Processing..."
            downloadLabel="Download"
            canApply={selectedPages.length > 0}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
            description="Drag pages in the preview to reorder them, or use the range input below to set an exact order."
            descriptionStartLabel="Upload your PDF"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleReverse}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-150 ${
                  justReversed
                    ? 'bg-blue-600 text-white scale-95'
                    : 'text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Reverse Order
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Quick Rearrange with Range
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={rangeInputStr}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  placeholder={`e.g. 5-3, 1, 2  (total: ${pdfDoc?.numPages || 0} pages)`}
                  className={inputClassName}
                />
                {rangeInputStr.trim() && (
                  <button
                    type="button"
                    onClick={handleApplyRange}
                    disabled={!!rangeError}
                    className={buttonClassName}
                  >
                    Apply
                  </button>
                )}
                {rangeApplied && (
                  <button
                    type="button"
                    onClick={handleClearRange}
                    className="text-xs font-bold text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-xl transition-all border border-slate-200 shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              {getRangeStatusMessage()}
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

PdfRearrangeDelete.propTypes = {
  toolName: PropTypes.string,
};
