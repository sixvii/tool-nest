import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import Select from '../../components/ui/Select';
import PdfLoader from '../../components/loaders/PdfLoader';
import { pdfToJpg, pdfToPng, pdfToTiff } from '../../services/imagePdfService';
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

const serviceMap = { jpg: pdfToJpg, png: pdfToPng, tiff: pdfToTiff };

const FORMAT_OPTIONS = [
  { label: 'JPG', value: 'jpg' },
  { label: 'PNG', value: 'png' },
  { label: 'TIFF', value: 'tiff' },
];

export default function PdfToImages({ defaultFormat = 'jpg' }) {
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(defaultFormat);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName: 'PdfToImages',
    snapshot: { file, fileName: file?.name ?? '', selected, resultBlob, resultName },
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
        setResultName(s.resultName ?? '');
        applied = true;
      }
      if (applied) return true;
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles?.[0] ?? null;
    if (
      nextFile &&
      (!nextFile.name.toLowerCase().endsWith('.pdf') || nextFile.type !== 'application/pdf')
    ) {
      setError('Only PDF files are allowed.');
      return;
    }
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
    setResultName('');
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
      const serviceFn = serviceMap[selected] || pdfToJpg;
      const responseBlob = await serviceFn([file]);
      if (conversionRef.current !== requestId) return;
      if (!responseBlob) {
        setError('Failed to convert PDF.');
        return;
      }

      const blobType = responseBlob.type ? responseBlob.type.toLowerCase() : '';
      const isSingleImage =
        blobType.includes('image/jpeg') ||
        blobType.includes('image/png') ||
        blobType.includes('image/tiff');
      const isZip = !isSingleImage || blobType.includes('zip') || blobType.includes('archive');
      const finalExtension = isZip ? 'zip' : selected;

      const safeBlob = new Blob([responseBlob], {
        type: isZip ? 'application/zip' : responseBlob.type,
      });
      setResultBlob(safeBlob);
      setResultName(`${stripFileExtension(file.name)}.${finalExtension}`);
    } catch (err) {
      if (conversionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, resultName || 'converted_files');
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <PdfLoader fileName="" operationLabel="Converting PDF to Images" />
      </div>
    );
  }

  return (
    <ToolPageLayout title="PDF to Image" subtitle="Convert your PDF pages to images" error={error}>
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your PDF' },
                { text: 'Choose an image output format' },
                { text: 'Download the converted pages' },
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
            uploadSubtitle="Upload a PDF and select the output image format"
            renderLoader={() => (
              <PdfLoader fileName={file?.name ?? ''} operationLabel="Converting PDF to Images" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert to Images"
            applyingLabel="Converting..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <Select
              label="Output Format Selection"
              options={FORMAT_OPTIONS}
              value={selected}
              onChange={handleSelectChange}
            />
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

PdfToImages.propTypes = {
  defaultFormat: PropTypes.oneOf(['jpg', 'png', 'tiff']),
};
