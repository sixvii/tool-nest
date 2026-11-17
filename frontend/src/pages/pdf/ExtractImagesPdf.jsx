import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import { extractImagesPdf } from '../../services/pdfService';
import {
  downloadBlob,
  isRestorableBlob,
  restoreFile,
  stripFileExtension,
  validateFile,
} from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

export default function ExtractImagesPdf({ toolName }) {
  const [file, setFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName,
    snapshot: { file, fileName: file?.name ?? '', resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        setFile(restoreFile(s.file, s.fileName));
        applied = true;
      }
      if (isRestorableBlob(s.resultBlob)) {
        setResultBlob(s.resultBlob);
        applied = true;
      }
      if (applied) return true;
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles?.[0] ?? null;
    if (nextFile) {
      try {
        validateFile(nextFile, { maxSizeMB: PDF_MAX_SIZE_MB });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFile(nextFile);
    setResultBlob(null);
    setError('');
  };

  const handleClearFile = () => {
    conversionRef.current += 1;
    setFile(null);
    setResultBlob(null);
    setError('');
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload a PDF first.');
      return;
    }
    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const data = await extractImagesPdf(file);
      if (conversionRef.current !== requestId) return;
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/zip' });
      setResultBlob(blob);
    } catch (err) {
      if (conversionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, `${stripFileExtension(file.name)}_images.zip`);
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Extracting Images" />
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'Extract Images from PDF'}
      subtitle="Extract every image from your PDF as a .zip file"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your PDF' },
                { text: 'Extract every embedded image' },
                { text: 'Download the image archive' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <PdfPreviewPanel
            file={file}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept=".pdf"
            uploadTitle="Drag & drop your PDF"
            uploadSubtitle="Extract every image from your PDF"
            renderLoader={() => (
              <PdfLoader fileName={file?.name ?? ''} operationLabel="Extracting Images" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Extract Images"
            applyingLabel="Extracting..."
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

ExtractImagesPdf.propTypes = {
  toolName: PropTypes.string,
};
