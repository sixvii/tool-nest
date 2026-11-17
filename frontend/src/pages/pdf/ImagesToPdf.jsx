import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PdfLoader from '../../components/loaders/PdfLoader';
import { imagesToPdf, heicToPdf, epsToPdf } from '../../services/imagePdfService';
import {
  downloadBlob,
  isRestorableBlob,
  restoreFile,
  stripFileExtension,
} from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

const MAX_SIZE_BYTES = PDF_MAX_SIZE_MB * 1024 * 1024;

const TABS = [
  {
    id: 'images',
    label: 'Images to PDF',
    acceptTypes: '.jpg,.jpeg,.png,.webp,.gif,.tiff',
    allowedExts: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff'],
    hint: 'Accepts JPG, PNG, WEBP, GIF, TIFF files',
    fn: imagesToPdf,
  },
  {
    id: 'heic',
    label: 'HEIC to PDF',
    acceptTypes: '.heic',
    allowedExts: ['.heic'],
    hint: 'Accepts HEIC files only',
    fn: heicToPdf,
  },
  {
    id: 'eps',
    label: 'EPS to PDF',
    acceptTypes: '.eps',
    allowedExts: ['.eps'],
    hint: 'Accepts EPS files only',
    fn: epsToPdf,
  },
];

const TAB_LABELS = TABS.map((t) => t.label);

export default function ImagesToPdf({ toolName = '' }) {
  const initialTab = TABS.find((t) => t.label === toolName)?.id ?? 'images';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [files, setFiles] = useState([]);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const currentTab = TABS.find((t) => t.id === activeTab);

  const { isRestoreSettled } = useToolPersistence({
    namespace: 'images-to-pdf',
    snapshot: {
      activeTab,
      files,
      fileNames: files.map((f) => f.name),
      resultBlob,
      resultName,
    },
    hasContent: files.length > 0 || Boolean(resultBlob) || activeTab !== initialTab,
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (s.activeTab && TABS.some((t) => t.id === s.activeTab)) setActiveTab(s.activeTab);
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

  const handleTabChange = (label) => {
    const tab = TABS.find((t) => t.label === label);
    if (!tab) return;
    conversionRef.current += 1;
    setActiveTab(tab.id);
    setFiles([]);
    setResultBlob(null);
    setResultName('');
    setError('');
  };

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
    if (!files.length) {
      setError('Please upload a file first.');
      return;
    }
    const invalid = files.filter(
      (f) => !currentTab.allowedExts.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (invalid.length) {
      setError(`Only ${currentTab.allowedExts.join(', ')} files are accepted.`);
      return;
    }

    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const data = await currentTab.fn(files);
      if (conversionRef.current !== requestId) return;
      const blob = data instanceof Blob ? data : new Blob([data]);
      setResultBlob(blob);
      setResultName(`${stripFileExtension(files[0].name)}.pdf`);
    } catch (err) {
      if (conversionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, resultName || 'converted.pdf');
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Converting to PDF" />
      </div>
    );
  }

  return (
    <ToolPageLayout title={currentTab.label} subtitle={currentTab.hint} error={error}>
      <ToolWorkspace
        showOptions={files.length > 0}
        isProcessing={isProcessing}
        preview={
          <PdfPreviewPanel
            files={files}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={currentTab.acceptTypes}
            multiple
            uploadTitle="Drag & drop your files"
            uploadSubtitle={currentTab.hint}
            renderLoader={() => (
              <PdfLoader fileName={files[0]?.name ?? ''} operationLabel="Converting to PDF" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert to PDF"
            applyingLabel="Converting..."
            downloadLabel="Download"
            description={currentTab.hint}
            descriptionStartLabel="Upload your files"
            tabs={TAB_LABELS}
            activeTab={currentTab.label}
            onTabChange={handleTabChange}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          />
        }
      />
    </ToolPageLayout>
  );
}

ImagesToPdf.propTypes = {
  toolName: PropTypes.string,
};
