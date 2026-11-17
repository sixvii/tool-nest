import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import { PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { cropPdf } from '../../services/pdfService';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

const DEFAULT_BOX = { x: 0, y: 0, width: 100, height: 100 };

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function CropCanvas({ pdfDoc, pageNumber, box, onBoxChange }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        if (!pdfDoc || !pageNumber) return;
        if (!cancelled) setLoading(true);
        if (!cancelled) setImgSrc(null);
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const scale = 2.2;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) {
          setImgSrc(canvas.toDataURL());
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  const getRelativePercent = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    return { x, y };
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (drag?.mode !== 'draw') {
        return;
      }
      const { x, y } = getRelativePercent(e.clientX, e.clientY);

      const x0 = Math.min(drag.startX, x);
      const y0 = Math.min(drag.startY, y);
      const x1 = Math.max(drag.startX, x);
      const y1 = Math.max(drag.startY, y);

      onBoxChange({
        x: x0,
        y: y0,
        width: Math.max(x1 - x0, 0.5),
        height: Math.max(y1 - y0, 0.5),
      });
    },
    [onBoxChange, getRelativePercent]
  );

  useEffect(() => {
    const handlePointerUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
      }
    };

    globalThis.addEventListener('pointermove', handlePointerMove);
    globalThis.addEventListener('pointerup', handlePointerUp);
    return () => {
      globalThis.removeEventListener('pointermove', handlePointerMove);
      globalThis.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const { x, y } = getRelativePercent(e.clientX, e.clientY);
    dragRef.current = { mode: 'draw', startX: x, startY: y };
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      className="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg select-none mx-auto cursor-crosshair shrink-0"
      style={{
        width: 'min(600px, 100%)',
        aspectRatio: '1 / 1.1',
      }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={`Page ${pageNumber}`}
          className="w-full h-full object-contain bg-white pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          {loading ? (
            <svg className="w-10 h-10 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-10 h-10 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}

      {imgSrc && (
        <div
          className="absolute border-2 border-blue-600 bg-blue-500/10 pointer-events-none shadow-md"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
        >
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
            <div className="border-r border-b border-dashed border-white" />
            <div className="border-r border-b border-dashed border-white" />
            <div className="border-b border-white border-dashed" />
            <div className="border-r border-b border-dashed border-white" />
            <div className="border-r border-b border-dashed border-white" />
            <div className="border-b border-white border-dashed" />
          </div>
        </div>
      )}

      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-md pointer-events-none z-10">
        Click & Drag to Draw Selection Area
      </div>
    </div>
  );
}

CropCanvas.propTypes = {
  pdfDoc: PropTypes.object,
  pageNumber: PropTypes.number.isRequired,
  box: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  onBoxChange: PropTypes.func.isRequired,
};

CropCanvas.defaultProps = {
  pdfDoc: null,
};

export default function PdfCrop({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [box, setBox] = useState(DEFAULT_BOX);
  const [downloadableResult, setDownloadableResult] = useState(null);
  const [viewResult, setViewResult] = useState(false);
  const replaceInputRef = useRef(null);

  useToolPersistence({
    namespace: 'pdf-crop',
    warnOnUnload: true,
    snapshot: { file: pdfFile, currentPage, box, downloadableResult },
    hasContent: Boolean(pdfFile) || Boolean(downloadableResult),
    onRestore: (s) => {
      if (!s.file) return;
      validateAndSetFile(s.file);
      if (typeof s.currentPage === 'number') setCurrentPage(s.currentPage);
      if (s.box) setBox(s.box);
      if (s.downloadableResult) setDownloadableResult(s.downloadableResult);
    },
  });

  const resetState = () => {
    setDownloadableResult(null);
    setViewResult(false);
    setError('');
    setSuccessMsg('');
    setBox(DEFAULT_BOX);
    setCurrentPage(1);
  };

  const validateAndSetFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files (.pdf) are accepted.');
      return;
    }
    if (file.size === 0) {
      setError('File is empty.');
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
      setNumPages(doc.numPages);
    } catch {
      setError('Failed to initialize document preview structure.');
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

  const handleResetArea = () => {
    setBox(DEFAULT_BOX);
    setDownloadableResult(null);
    setViewResult(false);
    setSuccessMsg('');
  };

  const handleBoxChange = useCallback((newBox) => {
    setBox(newBox);
    setDownloadableResult(null);
    setViewResult(false);
    setSuccessMsg('');
  }, []);

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(numPages, p + 1));

  const isBoxValid =
    box.width > 0 && box.height > 0 && box.x + box.width <= 100.01 && box.y + box.height <= 100.01;

  const resultFileName = () => stripFileExtension(pdfFile.name) + '_cropped.pdf';

  const handleApply = async () => {
    if (!pdfFile) {
      setError('Please upload a PDF first.');
      return;
    }
    if (!isBoxValid) {
      setError('Invalid crop region size constraints.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      const result = await cropPdf({
        file: pdfFile,
        xPercent: box.x,
        yPercent: box.y,
        widthPercent: box.width,
        heightPercent: box.height,
      });
      setSuccessMsg(`Successfully applied cropping configurations across all ${numPages} pages.`);
      setDownloadableResult(result);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!downloadableResult || !pdfFile) return;
    downloadBlob(downloadableResult, resultFileName());
  };

  let cropPreviewBody;
  if (viewResult && downloadableResult) {
    cropPreviewBody = <PdfPreview file={downloadableResult} />;
  } else if (numPages === 0) {
    cropPreviewBody = (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-sm font-medium">Assembling workspace canvas layout...</p>
      </div>
    );
  } else {
    cropPreviewBody = (
      <div className="flex flex-col min-h-0 gap-4">
        <CropCanvas
          pdfDoc={pdfDoc}
          pageNumber={currentPage}
          box={box}
          onBoxChange={handleBoxChange}
        />

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentPage <= 1}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${
              currentPage <= 1
                ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50/50'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev Page
          </button>

          <div className="bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-xl text-center min-w-[110px]">
            <span className="text-xs font-black text-slate-700">
              {currentPage} / {numPages}
            </span>
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={currentPage >= numPages}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl transition-all border ${
              currentPage >= numPages
                ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50/50'
                : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {successMsg && (
          <p className="text-xs font-semibold text-emerald-600 text-center">{successMsg}</p>
        )}
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'Crop PDF Pages'}
      subtitle="Draw a crop area on your PDF"
      error={error}
    >
      <Card padding="lg" className={`min-h-0 max-w-6xl mx-auto`}>
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
          <div className="flex flex-col gap-3 flex-1 w-full min-h-0">
            <PreviewPanelHeader
              statusLabel={`X: ${Math.round(box.x)}% · Y: ${Math.round(box.y)}% · W: ${Math.round(box.width)}% · H: ${Math.round(box.height)}%`}
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
                operationLabel="Cropping PDF"
                totalPages={numPages}
              />
            ) : (
              <div className="flex flex-1 flex-col min-h-0 rounded-xl bg-slate-300 p-4 overflow-auto">
                {cropPreviewBody}
              </div>
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
        {pdfFile && (
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              The selected area will crop all {numPages} pages uniformly.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleResetArea}
                disabled={isProcessing}
                className="sm:w-1/3"
              >
                Reset area
              </Button>
              <Button
                variant={downloadableResult ? 'success' : 'primary'}
                size="lg"
                fullWidth
                loading={isProcessing}
                disabled={!isBoxValid}
                onClick={downloadableResult ? handleDownload : handleApply}
                className="sm:flex-1"
              >
                {downloadableResult ? 'Download cropped PDF' : 'Crop PDF'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </ToolPageLayout>
  );
}

PdfCrop.propTypes = {
  toolName: PropTypes.string,
};
