import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import { pdfToWord } from '../../services/officeService';
import {
  downloadBlob,
  isRestorableBlob,
  restoreFile,
  stripFileExtension,
  validateFile,
} from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { OFFICE_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

export default function PdfToWord({ toolName = 'PDF to Word' }) {
  const [files, setFiles] = useState([]);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName,
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
    const file = newFiles?.[0] ?? null;
    if (!file) {
      setFiles([]);
      return;
    }
    try {
      validateFile(file, { maxSizeMB: OFFICE_MAX_SIZE_MB });
    } catch (err) {
      setError(err.message);
      return;
    }
    setFiles([file]);
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
    if (!files.length) {
      setError('Please upload a PDF first.');
      return;
    }
    if (!files[0].name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }

    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const data = await pdfToWord(files[0]);
      if (conversionRef.current !== requestId) return;
      const blob =
        data instanceof Blob
          ? data
          : new Blob([data], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
      setResultBlob(blob);
      setResultName(`${stripFileExtension(files[0].name)}.docx`);
    } catch (err) {
      if (conversionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, resultName || 'converted.docx');
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Converting to Word" />
      </div>
    );
  }

  return (
    <ToolPageLayout title={toolName} subtitle="Convert your PDF to a Word document" error={error}>
      <ToolWorkspace
        showOptions={files.length > 0}
        variant="guide"
        secondary={
          files.length > 0 ? (
            <ToolGuide
              steps={[
                { text: 'Upload your PDF' },
                { text: 'Convert it to an editable Word document' },
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
            uploadTitle="Drag & drop your PDF"
            uploadSubtitle="Accepts PDF files only"
            renderLoader={() => (
              <PdfLoader fileName={files[0]?.name ?? ''} operationLabel="Converting to Word" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert to Word"
            applyingLabel="Converting..."
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

PdfToWord.propTypes = {
  toolName: PropTypes.string,
};
