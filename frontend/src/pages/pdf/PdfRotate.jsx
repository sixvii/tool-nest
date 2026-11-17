import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min?url';
import { RotateCw, CheckCircle2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import { PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';
import { rotatePdf } from '../../services/pdfService';
import { clientErrorMessage } from '../../utils/apiError';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const LABELS = {
  uploadLabel: 'Upload PDF',
  changeImageButton: 'Change file',
  removeImageAriaLabel: 'Remove file',
};

function parseDashPart(dashMatch, pageCount, result) {
  const a = Number.parseInt(dashMatch[1], 10);
  const b = Number.parseInt(dashMatch[2], 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return;
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
    if (i >= 1 && i <= pageCount) result.add(i);
  }
}

function parseRange(rangeStr, pageCount) {
  const result = new Set();
  for (const part of rangeStr.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashMatch) {
      parseDashPart(dashMatch, pageCount, result);
    } else {
      const n = Number.parseInt(trimmed, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= pageCount) result.add(n);
    }
  }
  return result;
}

function validateDashPart(dashMatch, pageCount) {
  const a = Number.parseInt(dashMatch[1], 10);
  const b = Number.parseInt(dashMatch[2], 10);
  if (a < 1 || b < 1 || a > pageCount || b > pageCount)
    return `Page numbers must be between 1 and ${pageCount}.`;
  return '';
}

function validateSinglePart(singleMatch, pageCount) {
  const n = Number.parseInt(singleMatch[1], 10);
  if (n < 1 || n > pageCount) return `Page ${n} doesn't exist. PDF has ${pageCount} pages.`;
  return '';
}

function validateRangePart(trimmed, pageCount) {
  const dashMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (dashMatch) return validateDashPart(dashMatch, pageCount);
  if (singleMatch) return validateSinglePart(singleMatch, pageCount);
  return `Invalid format: "${trimmed}". Use e.g. 1-3, 5, 7`;
}

function validateRangeStr(rangeStr, pageCount) {
  if (!rangeStr.trim()) return 'Please enter a page range.';
  for (const part of rangeStr.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const err = validateRangePart(trimmed, pageCount);
    if (err) return err;
  }
  return '';
}

function getRangeInputClassName(rangeError, rangeSetSize) {
  if (rangeError) return 'border-red-300 focus:ring-red-200 bg-red-50';
  if (rangeSetSize > 0) return 'border-blue-300 focus:ring-blue-200 bg-blue-50';
  return 'border-slate-200 focus:ring-blue-100 bg-white';
}

export default function PdfRotate({ toolName }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [rangeInputStr, setRangeInputStr] = useState('');
  const [rangeError, setRangeError] = useState('');
  const [rangeSet, setRangeSet] = useState(new Set());
  const [rotationDegree, setRotationDegree] = useState(90);
  const [viewResult, setViewResult] = useState(false);

  const replaceInputRef = useRef(null);

  useToolPersistence({
    namespace: 'pdf-rotate',
    warnOnUnload: true,
    snapshot: { file: pdfFile, resultBlob },
    hasContent: Boolean(pdfFile) || Boolean(resultBlob),
    onRestore: (s) => {
      if (!s.file) return;
      validateAndSetFile(s.file);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const resetState = () => {
    setResultBlob(null);
    setViewResult(false);
    setErrorMsg('');
    setSuccessMsg('');
    setRangeInputStr('');
    setRangeError('');
    setRangeSet(new Set());
    setRotationDegree(90);
  };

  const validateAndSetFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only PDF files (.pdf) are accepted.');
      return;
    }
    if (file.size === 0) {
      setErrorMsg('File is empty.');
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
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setTotalPages(doc.numPages);
    } catch {
      setErrorMsg('Failed to load PDF preview.');
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
    resetState();
  };

  const handleRangeInputChange = (value) => {
    setRangeInputStr(value);
    setResultBlob(null);
    setViewResult(false);
    setSuccessMsg('');
    if (value.trim()) {
      const err = validateRangeStr(value, totalPages);
      setRangeError(err);
      if (err) {
        setRangeSet(new Set());
      } else {
        setRangeSet(parseRange(value, totalPages));
      }
    } else {
      setRangeError('');
      setRangeSet(new Set());
    }
  };

  const handleResetRange = () => {
    setRangeInputStr('');
    setRangeSet(new Set());
    setRangeError('');
    setResultBlob(null);
    setViewResult(false);
    setSuccessMsg('');
  };

  const togglePage = (pageNum) => {
    setRangeSet((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
    setResultBlob(null);
    setViewResult(false);
    setSuccessMsg('');
  };

  const handleApply = async () => {
    if (!pdfFile) {
      setErrorMsg('Please upload a PDF first.');
      return;
    }
    if (rangeSet.size === 0 || rangeError) {
      setErrorMsg('Please select at least one page.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsProcessing(true);

    try {
      const pageRanges = [...rangeSet].map((n) => n - 1).join(',');
      const blob = await rotatePdf({ file: pdfFile, degrees: rotationDegree, pageRanges });
      setResultBlob(blob);
      setSuccessMsg(`Successfully rotated ${rangeSet.size} page(s).`);
    } catch (err) {
      setErrorMsg(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob && pdfFile)
      downloadBlob(resultBlob, stripFileExtension(pdfFile.name) + '_rotated.pdf');
  };

  let rotatePreviewBody;
  if (viewResult && resultBlob) {
    rotatePreviewBody = <PdfPreview file={resultBlob} />;
  } else {
    rotatePreviewBody = (
      <PdfPreview file={pdfFile} selectedPages={rangeSet} onPageClick={togglePage} />
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'Rotate PDF Pages'}
      subtitle="Select pages and a rotation angle for your PDF"
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
                  statusLabel={`${rangeSet.size} page${rangeSet.size === 1 ? '' : 's'} selected`}
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
                    operationLabel="Rotating PDF"
                    totalPages={totalPages}
                  />
                ) : (
                  rotatePreviewBody
                )}

                {resultBlob && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100 shrink-0">
                    <CompareToggle
                      showOriginal={!viewResult}
                      onSelectView={(isOriginal) => setViewResult(!isOriginal)}
                      labels={{ beforeLabel: 'Before', afterLabel: 'After' }}
                      disabled={isProcessing}
                    />
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-emerald-600">{successMsg}</p>
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
            applyLabel="Rotate PDF"
            applyingLabel="Rotating..."
            downloadLabel="Download"
            canApply={rangeSet.size > 0 && !rangeError}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
            description="Select pages (click them in the preview or type a range), pick one rotation angle, then apply."
            descriptionStartLabel="Upload your PDF"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 shrink-0">
                <RotateCw className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Select pages &amp; rotation angle
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">(or click individual pages in the preview)</p>

            <div className="grid grid-cols-1 gap-2 mt-3">
              <input
                type="text"
                value={rangeInputStr}
                onChange={(e) => handleRangeInputChange(e.target.value)}
                placeholder={`e.g. 1-3, 5, 7 (total: ${totalPages} pages)`}
                className={`text-sm px-3 py-2 rounded-xl border transition-all outline-none focus:ring-2 ${getRangeInputClassName(rangeError, rangeSet.size)}`}
              />

              <select
                value={rotationDegree}
                onChange={(e) => {
                  setRotationDegree(Number.parseInt(e.target.value, 10));
                  setResultBlob(null);
                  setViewResult(false);
                  setSuccessMsg('');
                }}
                className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-200 outline-none transition-all cursor-pointer"
              >
                <option value={90}>90° (Turn Right / Clockwise)</option>
                <option value={180}>180° (Upside Down)</option>
                <option value={270}>270° (Turn Left / Counter-Clockwise)</option>
                <option value={0}>0° (Normal / Upright)</option>
              </select>
            </div>

            <div className="flex items-center justify-between mt-2">
              {(rangeInputStr.trim() || rangeSet.size > 0) && (
                <button
                  type="button"
                  onClick={handleResetRange}
                  className="text-xs font-bold text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                >
                  Clear Range
                </button>
              )}
              {rangeError && <p className="text-xs font-semibold text-red-600">{rangeError}</p>}
              {rangeSet.size > 0 && !rangeError && (
                <p className="text-xs text-blue-600 font-medium">✓ {rangeSet.size} pages ready</p>
              )}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfRotate.propTypes = {
  toolName: PropTypes.string,
};
