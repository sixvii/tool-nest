import { useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import Button from '../../components/ui/Button';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import Card from '../../components/ui/Card';
import { FileTabs, PdfPreview } from '../../components/toolPreview/PdfPreviewPrimitives';
import CompareToggle from '../../components/toolPreview/CompareToggle';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { splitPdf } from '../../services/pdfService';
import { downloadBlob, makeId, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { SPLIT_MODES } from '../../constants/pdf-constants/splitPdfConstants';
import { useToolPersistence } from '../../hooks/useToolPersistence';

export default function SplitPdf({ toolName }) {
  const [mode, setMode] = useState('ranges');
  const [ranges, setRanges] = useState(() => [{ id: makeId(), from: 1, to: 1 }]);
  const [mergeRanges, setMergeRanges] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [currentFile, setCurrentFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [viewResults, setViewResults] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);

  const clearResults = () => {
    setResults([]);
    setViewResults(false);
    setActiveResultIndex(0);
  };

  const loadPdfMeta = async (file) => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    setTotalPages(doc.numPages);
    setRanges([{ id: makeId(), from: 1, to: doc.numPages }]);
    setSelectedPages(new Set());
  };

  const { isRestoreSettled } = useToolPersistence({
    toolName,
    namespace: 'split-pdf',
    snapshot: {
      mode,
      ranges,
      mergeRanges,
      totalPages,
      selectedPages: [...selectedPages],
      currentFile,
    },
    hasContent: Boolean(currentFile),
    warnOnUnload: true,
    onRestore: (s) => {
      if (s.mode) setMode(s.mode);
      if (Array.isArray(s.ranges) && s.ranges.length) setRanges(s.ranges);
      if (typeof s.mergeRanges === 'boolean') setMergeRanges(s.mergeRanges);
      if (typeof s.totalPages === 'number') setTotalPages(s.totalPages);
      if (Array.isArray(s.selectedPages)) setSelectedPages(new Set(s.selectedPages));
      if (s.currentFile) {
        setCurrentFile(s.currentFile);
        loadPdfMeta(s.currentFile);
        return true;
      }
    },
  });

  const handleFiles = async (newFiles) => {
    const file = newFiles?.[0] ?? null;
    setError('');
    if (!file) {
      setCurrentFile(null);
      return;
    }
    try {
      validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }
    setCurrentFile(file);
    clearResults();
    await loadPdfMeta(file);
  };

  const handleClearFile = () => {
    setCurrentFile(null);
    setTotalPages(0);
    setRanges([{ id: makeId(), from: 1, to: 1 }]);
    setSelectedPages(new Set());
    setError('');
    clearResults();
  };

  const addRange = () => {
    setRanges((prev) => [...prev, { id: makeId(), from: 1, to: 1 }]);
    clearResults();
  };
  const removeRange = (id) => {
    setRanges((prev) => prev.filter((r) => r.id !== id));
    clearResults();
  };
  const updateRange = (id, key, value) => {
    setRanges((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: Number(value) } : r)));
    clearResults();
  };

  const togglePage = (pageNum) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      next.has(pageNum) ? next.delete(pageNum) : next.add(pageNum);
      return next;
    });
    clearResults();
  };

  const handleApply = async () => {
    if (!currentFile) {
      setError('Please upload a PDF first.');
      return;
    }
    setError('');
    clearResults();
    setIsProcessing(true);
    try {
      const file = currentFile;
      const baseName = file.name ? stripFileExtension(file.name) : 'document';
      const produced = [];

      if (mode === 'pages') {
        if (selectedPages.size === 0) {
          setError('Select at least one page.');
          return;
        }
        const sorted = [...selectedPages].sort((a, b) => a - b);
        for (const p of sorted) {
          const blob = await splitPdf({ file, pageRanges: `${p - 1}` });
          produced.push({ name: `${baseName}-page-${p}.pdf`, blob });
        }
      } else if (mergeRanges) {
        const pageRanges = ranges
          .map((r) => (r.from === r.to ? `${r.from - 1}` : `${r.from - 1}-${r.to - 1}`))
          .join(', ');
        const blob = await splitPdf({ file, pageRanges });
        produced.push({ name: `${baseName}-merged.pdf`, blob });
      } else {
        for (let i = 0; i < ranges.length; i++) {
          const r = ranges[i];
          const rangeStr = r.from === r.to ? `${r.from - 1}` : `${r.from - 1}-${r.to - 1}`;
          const blob = await splitPdf({ file, pageRanges: rangeStr });
          produced.push({ name: `${baseName}-range-${i + 1}.pdf`, blob });
        }
      }
      setResults(produced);
      setViewResults(true);
      setActiveResultIndex(0);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = () => {
    results.forEach((r) => downloadBlob(r.blob, r.name));
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Splitting PDF" />
      </div>
    );
  }

  return (
    <ToolPageLayout title={toolName} subtitle="Split your PDF into multiple files" error={error}>
      <ToolWorkspace
        showOptions={!!currentFile}
        isProcessing={isProcessing}
        preview={
          <div className="flex flex-col gap-3 h-full">
            <div className="flex-1 min-h-0">
              {viewResults && results.length > 0 ? (
                <Card
                  padding="lg"
                  className={`${TOOL_LAYOUT.previewPanel} min-h-[420px] lg:min-h-[600px] flex flex-col gap-3`}
                >
                  <p className="text-xs font-semibold text-slate-500">
                    {results.length} split file{results.length > 1 ? 's' : ''}
                  </p>
                  <FileTabs
                    files={results.map(
                      (r) => new File([r.blob], r.name, { type: 'application/pdf' })
                    )}
                    activeIndex={activeResultIndex}
                    onSelect={setActiveResultIndex}
                  />
                  <div className="flex-1 min-h-0">
                    <PdfPreview
                      file={
                        new File(
                          [results[activeResultIndex].blob],
                          results[activeResultIndex].name,
                          { type: 'application/pdf' }
                        )
                      }
                    />
                  </div>
                </Card>
              ) : (
                <PdfPreviewPanel
                  file={currentFile}
                  isProcessing={isProcessing}
                  onFiles={handleFiles}
                  onClearFile={handleClearFile}
                  accept=".pdf"
                  showCompareToggle={false}
                  selectedPages={mode === 'pages' ? selectedPages : undefined}
                  onPageClick={mode === 'pages' ? togglePage : undefined}
                  highlightRanges={mode === 'ranges' ? ranges : undefined}
                  uploadTitle="Drag & drop your PDF"
                  uploadSubtitle="Split your PDF into multiple files"
                  renderLoader={() => (
                    <PdfLoader
                      fileName={currentFile?.name ?? ''}
                      operationLabel="Splitting PDF"
                      totalPages={totalPages}
                    />
                  )}
                />
              )}
            </div>
            {results.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100 shrink-0">
                <CompareToggle
                  showOriginal={!viewResults}
                  onSelectView={(isOriginal) => setViewResults(!isOriginal)}
                  labels={{ beforeLabel: 'Editor', afterLabel: 'Split Files' }}
                />
              </div>
            )}
          </div>
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={false}
            applyLabel="Split PDF"
            applyingLabel="Splitting..."
            onApply={handleApply}
            showApply
            description="Split your PDF into multiple files"
            descriptionStartLabel="Upload your PDF"
            footer={
              <>
                {results.length === 1 && (
                  <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-4 mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-black text-emerald-700">Split into 1 file!</p>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {results[0].name}
                      </p>
                    </div>
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      onClick={() => downloadBlob(results[0].blob, results[0].name)}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                )}

                {results.length > 1 && (
                  <div className="border border-emerald-100 bg-emerald-50/30 rounded-2xl p-4 mt-4 space-y-3">
                    <p className="text-xs font-black text-emerald-700">
                      Split into {results.length} files!
                    </p>
                    <Button variant="success" size="lg" fullWidth onClick={handleDownloadAll}>
                      <Download className="w-4 h-4" />
                      Download All
                    </Button>
                    <div className="space-y-1.5">
                      {results.map((r) => (
                        <div
                          key={r.name}
                          className="flex items-center justify-between bg-white border border-emerald-100 rounded-xl px-3 py-2"
                        >
                          <span className="text-xs text-slate-600 font-medium truncate pr-2">
                            {r.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => downloadBlob(r.blob, r.name)}
                            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-bold shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            }
          >
            <div className="flex gap-2 mt-2">
              {SPLIT_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    clearResults();
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors
                    ${
                      mode === m.key
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'
                    }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'ranges' && (
              <div className="mt-3 space-y-2">
                {ranges.map((r, i) => (
                  <div
                    key={r.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Range {i + 1}</span>
                      {ranges.length > 1 && (
                        <button
                          onClick={() => removeRange(r.id)}
                          className="text-rose-400 hover:text-rose-600 text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`from-${r.id}`} className="text-xs text-slate-400">
                          From
                        </label>
                        <input
                          id={`from-${r.id}`}
                          type="number"
                          min={1}
                          max={totalPages || undefined}
                          value={r.from}
                          onChange={(e) => updateRange(r.id, 'from', e.target.value)}
                          className="w-16 text-center text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label htmlFor={`to-${r.id}`} className="text-xs text-slate-400">
                          To
                        </label>
                        <input
                          id={`to-${r.id}`}
                          type="number"
                          min={1}
                          max={totalPages || undefined}
                          value={r.to}
                          onChange={(e) => updateRange(r.id, 'to', e.target.value)}
                          className="w-16 text-center text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addRange}
                  className="w-full border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 text-xs font-medium py-2 rounded-xl transition-colors"
                >
                  + Add Range
                </button>

                {ranges.length > 1 && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mt-1">
                    <div>
                      <p className="text-xs font-medium text-slate-600">
                        Merge all ranges into one PDF
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Off = each range downloads separately
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setMergeRanges((prev) => !prev);
                        clearResults();
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative ${mergeRanges ? 'bg-blue-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${mergeRanges ? 'left-5' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-slate-300 mt-2">
              Pages are 1-indexed. Example: From 1 To 3 extracts pages 1, 2, 3.
            </p>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

SplitPdf.propTypes = {
  toolName: PropTypes.string.isRequired,
};
