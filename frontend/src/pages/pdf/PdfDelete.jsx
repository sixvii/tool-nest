import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import Card from '../../components/ui/Card';
import { PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { deletePagesPdf } from '../../services/pdfService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

function getDashRange(dashMatch, pageCount) {
  const rangeSet = new Set();
  const startPage = Number.parseInt(dashMatch[1], 10);
  const endPage = Number.parseInt(dashMatch[2], 10);

  if (!Number.isNaN(startPage) && !Number.isNaN(endPage)) {
    const minPage = Math.min(startPage, endPage);
    const maxPage = Math.max(startPage, endPage);
    for (let i = minPage; i <= maxPage; i++) {
      if (i >= 1 && i <= pageCount) {
        rangeSet.add(i);
      }
    }
  }
  return rangeSet;
}

function parseRange(rangeStr, pageCount) {
  const result = new Set();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashMatch) {
      const parsedRange = getDashRange(dashMatch, pageCount);
      parsedRange.forEach((page) => result.add(page));
    } else {
      const pageNum = Number.parseInt(trimmed, 10);
      if (!Number.isNaN(pageNum) && pageNum >= 1 && pageNum <= pageCount) {
        result.add(pageNum);
      }
    }
  }
  return result;
}

function checkDashMatchError(dashMatch, pageCount) {
  const startPage = Number.parseInt(dashMatch[1], 10);
  const endPage = Number.parseInt(dashMatch[2], 10);
  if (startPage < 1 || endPage < 1 || startPage > pageCount || endPage > pageCount) {
    return `Page numbers must be between 1 and ${pageCount}.`;
  }
  return '';
}

function checkSingleMatchError(singleMatch, pageCount) {
  const pageNum = Number.parseInt(singleMatch[1], 10);
  if (pageNum < 1 || pageNum > pageCount) {
    return `Page ${pageNum} doesn't exist. PDF has ${pageCount} pages.`;
  }
  return '';
}

function validateRangeStr(rangeStr, pageCount) {
  if (!rangeStr.trim()) return 'Please enter a page range.';
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = trimmed.match(/^(\d+)$/);

    if (dashMatch) {
      const error = checkDashMatchError(dashMatch, pageCount);
      if (error) return error;
    } else if (singleMatch) {
      const error = checkSingleMatchError(singleMatch, pageCount);
      if (error) return error;
    } else {
      return `Invalid format: "${trimmed}". Use e.g. 1-3, 5, 7`;
    }
  }
  return '';
}

function PageThumbnail({ pageNumber, pdfDoc, index, onRemove, isMarkedForDelete }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const renderThumbnail = async () => {
      try {
        if (!pdfDoc || !pageNumber) return;
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 2.2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        if (isMounted) {
          setThumbnail(canvas.toDataURL());
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    };
    renderThumbnail();
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, pageNumber]);

  let containerClasses =
    'relative group transition-all hover:scale-[1.02] w-full max-w-xs mx-auto cursor-pointer';
  if (isMarkedForDelete) containerClasses += ' opacity-60';

  let borderClasses =
    'w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all flex items-center justify-center border-2';
  if (isMarkedForDelete) {
    borderClasses += ' border-red-400 ring-2 ring-red-200 bg-red-50';
  } else {
    borderClasses += ' border-slate-200 bg-slate-100';
  }

  let badgeClasses =
    'absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 border-white shadow-lg';
  if (isMarkedForDelete) {
    badgeClasses += ' bg-red-500 text-white';
  } else {
    badgeClasses += ' bg-blue-600 text-white';
  }

  let btnClasses =
    'absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg border-2 border-white';
  if (isMarkedForDelete) {
    btnClasses += ' bg-blue-500 hover:bg-blue-600 text-white';
  } else {
    btnClasses += ' bg-red-500 hover:bg-red-600 text-white';
  }

  let labelClasses = 'text-center text-xs font-semibold mt-2';
  if (isMarkedForDelete) {
    labelClasses += ' text-red-400 line-through';
  } else {
    labelClasses += ' text-slate-500';
  }

  return (
    <div className={containerClasses}>
      <div className={borderClasses}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Page ${pageNumber}`}
            className="w-full h-full object-contain bg-white"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            {loading ? (
              <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-slate-300 text-xs">PDF</span>
            )}
          </div>
        )}
      </div>

      <div className={badgeClasses}>{index + 1}</div>

      <button type="button" onClick={onRemove} className={btnClasses}>
        {isMarkedForDelete ? '✓' : '✕'}
      </button>

      {isMarkedForDelete && (
        <div className="absolute inset-0 bg-red-600/10 rounded-2xl flex items-center justify-center pointer-events-none">
          <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase">
            Deleted
          </span>
        </div>
      )}

      <p className={labelClasses}>Page {index + 1}</p>
    </div>
  );
}

PageThumbnail.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  pdfDoc: PropTypes.object,
  index: PropTypes.number.isRequired,
  onRemove: PropTypes.func.isRequired,
  isMarkedForDelete: PropTypes.bool.isRequired,
};

function RangeControls({
  rangeInputStr,
  onChangeRange,
  onClearRange,
  rangeError,
  rangeSet,
  onApplyRange,
  maxPages,
}) {
  let inputBorder = 'border-slate-200 focus:ring-blue-100 bg-white';
  if (rangeError || rangeSet.size > 0) {
    inputBorder = 'border-red-300 focus:ring-red-200 bg-red-50';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-700 uppercase">Delete pages by range</span>
      </div>
      <p className="text-xs text-slate-400">(or click individual pages in the preview)</p>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={rangeInputStr}
          onChange={(e) => onChangeRange(e.target.value)}
          placeholder={`e.g. 1-3, 5, 7  (total: ${maxPages} pages)`}
          className={`text-sm px-3 py-2 rounded-xl border transition-all outline-none focus:ring-2 ${inputBorder}`}
        />
        <div className="flex items-center gap-2 flex-wrap">
          {rangeInputStr.trim() && (
            <button
              type="button"
              onClick={onClearRange}
              className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl border"
            >
              Clear
            </button>
          )}
          {rangeSet.size > 0 && !rangeError && (
            <button
              type="button"
              onClick={onApplyRange}
              className="text-xs font-black text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl shadow-sm"
            >
              Mark {rangeSet.size} for deletion
            </button>
          )}
        </div>
      </div>
      {rangeError && <p className="text-xs font-semibold text-red-600">{rangeError}</p>}
    </div>
  );
}

RangeControls.propTypes = {
  rangeInputStr: PropTypes.string.isRequired,
  onChangeRange: PropTypes.func.isRequired,
  onClearRange: PropTypes.func.isRequired,
  rangeError: PropTypes.string.isRequired,
  rangeSet: PropTypes.object.isRequired,
  onApplyRange: PropTypes.func.isRequired,
  maxPages: PropTypes.number.isRequired,
};

export default function PdfDelete({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [allPages, setAllPages] = useState([]);
  const [markedPages, setMarkedPages] = useState(new Set());
  const [downloadableResult, setDownloadableResult] = useState(null);
  const [viewResult, setViewResult] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [rangeInputStr, setRangeInputStr] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [rangeSet, setRangeSet] = useState(new Set());

  const replaceInputRef = useRef(null);

  useToolPersistence({
    namespace: 'pdf-delete',
    warnOnUnload: true,
    snapshot: { file: pdfFile, markedPages, downloadableResult },
    hasContent: Boolean(pdfFile) || Boolean(downloadableResult),
    onRestore: async (s) => {
      if (!s.file) return;
      setPdfFile(s.file);
      if (s.markedPages instanceof Set) setMarkedPages(s.markedPages);
      else if (Array.isArray(s.markedPages)) setMarkedPages(new Set(s.markedPages));
      if (s.downloadableResult) setDownloadableResult(s.downloadableResult);
      try {
        const arrayBuffer = await s.file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(doc);
        setAllPages(Array.from({ length: doc.numPages }, (_, i) => i + 1));
      } catch {
        setErrorMsg('Failed to load PDF. Please try another file.');
      }
    },
  });

  const resetState = () => {
    setDownloadableResult(null);
    setViewResult(false);
    setExpanded(false);
    setErrorMsg('');
    setAllPages([]);
    setMarkedPages(new Set());
    setRangeInputStr('');
    setRangeError('');
    setRangeSet(new Set());
  };

  const validateAndSetFile = async (file) => {
    if (!file) return;
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfExt) {
      setErrorMsg('Invalid file. Only PDF files (.pdf) are accepted.');
      return;
    }
    if (file.size === 0) {
      setErrorMsg('This file appears to be empty.');
      return;
    }
    try {
      validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB });
    } catch (err) {
      setErrorMsg(err.message);
      return;
    }

    setErrorMsg('');
    setPdfFile(file);
    resetState();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(doc);
      setAllPages(Array.from({ length: doc.numPages }, (_, i) => i + 1));
    } catch {
      setErrorMsg('Failed to load PDF. Please try another file.');
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
    if (value.trim()) {
      const err = validateRangeStr(value, pdfDoc?.numPages || 0);
      setRangeError(err);
      if (!err) setRangeSet(parseRange(value, pdfDoc?.numPages || 0));
    } else {
      setRangeError('');
      setRangeSet(new Set());
    }
  };

  const handleApplyRange = () => {
    if (rangeSet.size === 0 || rangeError) return;
    setMarkedPages((prev) => {
      const next = new Set(prev);
      rangeSet.forEach((p) => next.add(p));
      return next;
    });
    setRangeInputStr('');
    setRangeSet(new Set());
    setDownloadableResult(null);
    setViewResult(false);
  };

  const handleToggleMarkPage = (pageNum) => {
    setDownloadableResult(null);
    setViewResult(false);
    setMarkedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      return next;
    });
  };

  const handleApply = async () => {
    if (markedPages.size >= allPages.length) {
      setErrorMsg('At least one page must remain in the PDF.');
      return;
    }
    setErrorMsg('');
    setIsProcessing(true);
    try {
      const deletePages = Array.from(markedPages).sort((a, b) => a - b);
      const blob = await deletePagesPdf({ file: pdfFile, deletePages });
      setDownloadableResult(blob);
    } catch (err) {
      setErrorMsg(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadableResult || !pdfFile) return;
    downloadBlob(downloadableResult, stripFileExtension(pdfFile.name) + '_deleted.pdf');
  };

  const deletedCount = markedPages.size;
  const canApply = deletedCount > 0 && deletedCount < allPages.length;
  const pageWordSuffix = deletedCount > 1 ? 's' : '';
  const deleteApplyLabel =
    deletedCount > 0 ? `Delete ${deletedCount} Page${pageWordSuffix}` : 'No Pages Marked';

  let deletePreviewBody;
  if (viewResult && downloadableResult) {
    deletePreviewBody = <PdfPreview file={downloadableResult} />;
  } else {
    deletePreviewBody = (
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full overflow-y-auto">
          {(expanded || allPages.length <= 2 ? allPages : allPages.slice(0, 2)).map(
            (pageNum, index) => (
              <div
                key={pageNum}
                role="button"
                tabIndex={0}
                onClick={() => handleToggleMarkPage(pageNum)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleMarkPage(pageNum);
                  }
                }}
                className="w-full text-left bg-transparent border-0 p-0 m-0 outline-none rounded-2xl block cursor-pointer"
              >
                <PageThumbnail
                  pageNumber={pageNum}
                  pdfDoc={pdfDoc}
                  index={index}
                  onRemove={(e) => {
                    e?.stopPropagation?.();
                    handleToggleMarkPage(pageNum);
                  }}
                  isMarkedForDelete={markedPages.has(pageNum)}
                />
              </div>
            )
          )}
        </div>
        {allPages.length > 2 && (
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
      title={toolName ?? 'Delete PDF Pages'}
      subtitle="Remove pages from your PDF"
      error={errorMsg}
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
                  statusLabel={`${allPages.length - deletedCount} of ${allPages.length} pages remaining`}
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
                    operationLabel="Deleting PDF Pages"
                    totalPages={pdfDoc?.numPages ?? 0}
                  />
                ) : (
                  deletePreviewBody
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
            applyLabel={deleteApplyLabel}
            applyingLabel="Deleting..."
            downloadLabel="Download"
            canApply={canApply}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
            description="Click any page in the preview to mark it for deletion, or delete a range of pages at once below."
            descriptionStartLabel="Upload your PDF"
          >
            <RangeControls
              rangeInputStr={rangeInputStr}
              onChangeRange={handleRangeInputChange}
              onClearRange={() => {
                setRangeInputStr('');
                setRangeError('');
                setRangeSet(new Set());
              }}
              rangeError={rangeError}
              rangeSet={rangeSet}
              onApplyRange={handleApplyRange}
              maxPages={pdfDoc?.numPages || 0}
            />

            {deletedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMarkedPages(new Set());
                  setDownloadableResult(null);
                  setViewResult(false);
                }}
                className="w-full mt-4 text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-all"
              >
                Undo All
              </button>
            )}
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfDelete.propTypes = {
  toolName: PropTypes.string,
};
