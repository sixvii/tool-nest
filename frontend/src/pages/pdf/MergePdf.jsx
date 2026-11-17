import { useRef, useState } from 'react';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import { mergePdfs } from '../../services/pdfService';
import { downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

const MAX_SIZE_BYTES = PDF_MAX_SIZE_MB * 1024 * 1024;

export default function MergePdf() {
  const [files, setFiles] = useState([]);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName: 'MergePdf',
    snapshot: {
      files,
      fileNames: files.map((f) => f.name),
      resultBlob,
      resultName,
    },
    hasContent: files.length > 0 || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (Array.isArray(s.files) && s.files.length) {
        const restored = s.files
          .map((f, i) => restoreFile(f, s.fileNames?.[i] ?? f?.name))
          .filter(Boolean);
        if (restored.length) {
          setFiles(restored);
          applied = true;
        }
      }
      if (isRestorableBlob(s.resultBlob)) {
        setResultBlob(s.resultBlob);
        setResultName(s.resultName ?? '');
        applied = true;
      }
      if (applied) return true;
    },
  });

  const handleFiles = (newFiles) => {
    const list = newFiles ?? [];
    const totalSize = list.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_SIZE_BYTES) {
      setError(
        `Combined file size too large. Max 50 MB total. Your files: ${(totalSize / 1024 / 1024).toFixed(1)} MB.`
      );
      return;
    }
    setFiles(list);
    setResultBlob(null);
    setError('');
  };

  const handleClearFile = () => {
    conversionRef.current += 1;
    setFiles([]);
    setResultBlob(null);
    setResultName('');
    setError('');
  };

  const handleApply = async () => {
    if (files.length < 2) {
      setError('Please upload at least two PDF files to merge.');
      return;
    }
    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const data = await mergePdfs(files);
      if (conversionRef.current !== requestId) return;
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
      setResultBlob(blob);
      setResultName('merged.pdf');
    } catch (err) {
      if (conversionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, resultName || 'merged.pdf');
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Merging PDFs" />
      </div>
    );
  }

  return (
    <ToolPageLayout title="Merge PDFs" subtitle="Combine multiple PDF files into one" error={error}>
      <ToolWorkspace
        showOptions={files.length > 0}
        variant="guide"
        secondary={
          files.length > 0 ? (
            <ToolGuide
              steps={[
                { text: 'Upload your PDFs' },
                { text: 'Combine multiple PDF files into one, in the order they were uploaded' },
                { text: 'Download the result' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <PdfPreviewPanel
            files={files}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept=".pdf"
            multiple
            uploadTitle="Drag & drop your PDFs"
            uploadSubtitle="Upload two or more PDF files to merge"
            renderLoader={() => (
              <PdfLoader fileName={files[0]?.name ?? ''} operationLabel="Merging PDFs" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Merge PDFs"
            applyingLabel="Merging..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          />
        }
      />
    </ToolPageLayout>
  );
}
