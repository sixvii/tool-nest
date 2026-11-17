import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { Check, FileText } from 'lucide-react';
import Card from '../../components/ui/Card';
import { PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { resizePdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

const PRESETS = [
  { label: 'A4', width: 595, height: 842, description: 'Standard International Document' },
  { label: 'Letter', width: 612, height: 792, description: 'US Standard Business Letter' },
  { label: 'A3', width: 842, height: 1191, description: 'Large Print / Posters' },
  { label: 'Custom', width: null, height: null, description: 'Enter specific dimensions manually' },
];

function PageResizeThumbnail({ pageNumber, pdfDoc, displayWidth, displayHeight }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const renderThumbnail = async () => {
      try {
        if (!pdfDoc || !pageNumber) return;
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const viewport = page.getViewport({ scale: 1.5 });
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
    renderThumbnail();
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="relative bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between transition-all">
      <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center relative border border-slate-100 p-2">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Preview of page ${pageNumber}`}
            className="w-full h-full object-contain bg-white rounded shadow-sm"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {loading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-8 h-8 text-slate-300" />
            )}
          </div>
        )}

        <div className="absolute bottom-3 right-3 text-[10px] font-black bg-slate-800/90 backdrop-blur-sm text-white px-2 py-0.5 rounded shadow-sm">
          {displayWidth || '?'} × {displayHeight || '?'} pt
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">Page {pageNumber}</span>
        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
          Resizing
        </span>
      </div>
    </div>
  );
}

PageResizeThumbnail.propTypes = {
  pageNumber: PropTypes.number.isRequired,
  pdfDoc: PropTypes.shape({
    getPage: PropTypes.func.isRequired,
  }),
  displayWidth: PropTypes.string,
  displayHeight: PropTypes.string,
};

export default function PdfResize({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);

  const [preset, setPreset] = useState('A4');
  const [width, setWidth] = useState('595');
  const [height, setHeight] = useState('842');

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [inputError, setInputError] = useState('');
  const [viewResult, setViewResult] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const replaceInputRef = useRef(null);

  useToolPersistence({
    namespace: 'pdf-resize',
    warnOnUnload: true,
    snapshot: { file: pdfFile, preset, width, height, resultBlob },
    hasContent: Boolean(pdfFile) || Boolean(resultBlob),
    onRestore: (s) => {
      if (!s.file) return;
      validateAndSetFile(s.file);
      if (s.preset) setPreset(s.preset);
      if (typeof s.width === 'string') setWidth(s.width);
      if (typeof s.height === 'string') setHeight(s.height);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const resetState = () => {
    setResultBlob(null);
    setViewResult(false);
    setExpanded(false);
    setError('');
    setSuccessMsg('');
    setInputError('');
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
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch {
      setError('Failed to load PDF preview.');
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
    setTotalPages(0);
    resetState();
  };

  const handlePresetClick = (p) => {
    setPreset(p.label);
    if (p.width) {
      setWidth(String(p.width));
      setHeight(String(p.height));
    }
    setInputError('');
    setResultBlob(null);
    setViewResult(false);
  };

  const validateDimensions = () => {
    const w = Number(width);
    const h = Number(height);
    if (!w || !h || w <= 0 || h <= 0) return 'Width and height must be positive numbers.';
    if (w > 5000 || h > 5000) return 'Maximum dimension size allowed is 5000 pt.';
    return '';
  };

  const handleApply = async () => {
    if (!pdfFile) {
      setError('No PDF file selected.');
      return;
    }
    const dimensionError = validateDimensions();
    if (dimensionError) {
      setInputError(dimensionError);
      return;
    }

    setError('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      const responseBlob = await resizePdf({
        file: pdfFile,
        width: Number(width),
        height: Number(height),
      });

      setResultBlob(responseBlob);
      setSuccessMsg(`Successfully resized all ${totalPages} pages uniformly.`);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob && pdfFile)
      downloadBlob(resultBlob, stripFileExtension(pdfFile.name) + '_resized.pdf');
  };

  let resizePreviewBody;
  if (viewResult && resultBlob) {
    resizePreviewBody = <PdfPreview file={resultBlob} />;
  } else if (totalPages === 0) {
    resizePreviewBody = (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Loading preview pages layout...</p>
      </div>
    );
  } else {
    resizePreviewBody = (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full overflow-y-auto">
          {(expanded || totalPages <= 2
            ? Array.from({ length: totalPages }, (_, i) => i + 1)
            : [1, 2]
          ).map((pageNum) => (
            <PageResizeThumbnail
              key={pageNum}
              pageNumber={pageNum}
              pdfDoc={pdfDoc}
              displayWidth={width}
              displayHeight={height}
            />
          ))}
        </div>
        {totalPages > 2 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-xs font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              {expanded ? 'Show less' : `Show all ${totalPages} pages`}
            </button>
          </div>
        )}
        {successMsg && (
          <p className="text-xs font-semibold text-emerald-600 text-center">{successMsg}</p>
        )}
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'Resize PDF Pages'}
      subtitle="Resize the page dimensions of your PDF"
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
                uploadSubtitle="Accepted: PDF files only · Max file size: 50 MB"
              />
            ) : (
              <div className="flex flex-col gap-3 flex-1 w-full min-h-[45vh] max-h-fit">
                <PreviewPanelHeader
                  statusLabel={`Targeting: ${width} × ${height} pt (${preset}) · ${totalPages} pages`}
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
                    operationLabel="Resizing PDF"
                    totalPages={totalPages}
                  />
                ) : (
                  resizePreviewBody
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
            applyLabel="Resize PDF"
            applyingLabel="Resizing..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Page Layout Preset
              </span>

              <div className="grid grid-cols-2 gap-3">
                {PRESETS.map((p) => {
                  const isSelected = preset === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className={`p-3 text-left rounded-xl border flex flex-col justify-between transition-all outline-none ${
                        isSelected
                          ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-100'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-sm font-extrabold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}
                        >
                          {p.label}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-medium">
                        {p.description}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 mt-2">
                        {p.width ? `${p.width} × ${p.height} pt` : 'Variable'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 my-4" />

            <div className="space-y-2">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Dimensions Input (in points)
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Note: 1 inch equals 72 PDF points (pt). Standard A4 dimensions match 595 × 842 pt.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label htmlFor="pdf-width-input" className="text-xs font-semibold text-slate-500">
                    Width Value
                  </label>
                  <input
                    id="pdf-width-input"
                    type="number"
                    min="1"
                    max="5000"
                    value={width}
                    onChange={(e) => {
                      setWidth(e.target.value);
                      setPreset('Custom');
                      setInputError('');
                      setResultBlob(null);
                      setViewResult(false);
                    }}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                    placeholder="Width e.g. 595"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="pdf-height-input"
                    className="text-xs font-semibold text-slate-500"
                  >
                    Height Value
                  </label>
                  <input
                    id="pdf-height-input"
                    type="number"
                    min="1"
                    max="5000"
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);
                      setPreset('Custom');
                      setInputError('');
                      setResultBlob(null);
                      setViewResult(false);
                    }}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                    placeholder="Height e.g. 842"
                  />
                </div>
              </div>
              {inputError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl mt-1">
                  {inputError}
                </p>
              )}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfResize.propTypes = {
  toolName: PropTypes.string,
};
