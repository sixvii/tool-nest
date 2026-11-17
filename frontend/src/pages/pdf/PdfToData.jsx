import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import Select from '../../components/ui/Select';
import PdfLoader from '../../components/loaders/PdfLoader';
import { pdfToText, pdfToCsv, pdfToExcel } from '../../services/pdfDataService';
import {
  downloadBlob,
  isRestorableBlob,
  restoreFile,
  stripFileExtension,
  validateFile,
} from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { DEFAULT_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

const serviceMap = {
  'Text (.txt)': pdfToText,
  'CSV (.csv)': pdfToCsv,
  'Excel (.xlsx)': pdfToExcel,
};

const extMap = {
  'Text (.txt)': 'txt',
  'CSV (.csv)': 'csv',
  'Excel (.xlsx)': 'xlsx',
};

const defaultFormatForTool = {
  'PDF to Text': 'Text (.txt)',
  'PDF to CSV': 'CSV (.csv)',
  'PDF to Excel': 'Excel (.xlsx)',
};

export default function PdfToData({ toolName }) {
  const initialFormat = defaultFormatForTool[toolName] ?? 'Text (.txt)';
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(initialFormat);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName,
    snapshot: { file, fileName: file?.name ?? '', selected, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        setFile(restoreFile(s.file, s.fileName));
        applied = true;
      }
      if (typeof s.selected === 'string' && s.selected) setSelected(s.selected);
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
        validateFile(nextFile, { maxSizeMB: DEFAULT_MAX_SIZE_MB });
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

  const handleSelectChange = (e) => {
    setSelected(e.target.value);
    setResultBlob(null);
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
      const data = await serviceMap[selected](file);
      if (conversionRef.current !== requestId) return;
      const blob = data instanceof Blob ? data : new Blob([data]);
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
    downloadBlob(resultBlob, `${stripFileExtension(file.name)}.${extMap[selected]}`);
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel={`Converting to ${selected}`} />
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={toolName ?? 'PDF to Data'}
      subtitle="Extract text, CSV, or Excel data from your PDF"
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
                { text: 'Choose a text, CSV, or Excel export' },
                { text: 'Download the extracted data' },
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
            uploadSubtitle="Extract text, CSV, or Excel data from your PDF"
            renderLoader={() => (
              <PdfLoader fileName={file?.name ?? ''} operationLabel={`Converting to ${selected}`} />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert"
            applyingLabel="Converting..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <Select
              label="Export As"
              options={['Text (.txt)', 'CSV (.csv)', 'Excel (.xlsx)']}
              value={selected}
              onChange={handleSelectChange}
            />
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfToData.propTypes = {
  toolName: PropTypes.string,
};
