import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { imageToText } from '../../../services/imageService';
import { validateFile } from '../../../utils/fileUtils';
import { FILE_DATA_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import { copyToClipboard } from '../../../utils/clipboardUtils';
import { toastSuccess } from '../../../utils/toastUtils';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import Heading from '../../../components/ui/Heading';
import Textarea from '../../../components/ui/Textarea';
import Button from '../../../components/ui/Button';
import { IMAGE_TO_TEXT_COPY } from '../../../constants/image/imageToText/imageToTextConstants';
import { getImageToTextPreviewLabels } from '../../../utils/image/imageToText/imageToTextUtils';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function ImageToText() {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: { file, extractedText },
    hasContent: Boolean(file) || Boolean(extractedText),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (typeof s.extractedText === 'string') setExtractedText(s.extractedText);
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (!nextFile) return;

    try {
      validateFile(nextFile, { maxSizeMB: FILE_DATA_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(clientErrorMessage(err));
      return;
    }

    setError('');
    setFile(nextFile);
    setExtractedText('');
  };

  const handleClearImage = () => {
    setFile(null);
    setExtractedText('');
    setError('');
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await copyToClipboard(extractedText);
      setCopied(true);
      toastSuccess('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError(clientErrorMessage(err) || 'Failed to copy. Please try again.');
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError(IMAGE_TO_TEXT_COPY.noFileError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await imageToText(file);
      const text = await blob.text();
      setExtractedText(text);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ImageToolPage
      title={IMAGE_TO_TEXT_COPY.title}
      subtitle={IMAGE_TO_TEXT_COPY.subtitle}
      error={error}
    >
      <ImageToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <ImageToolPreviewPanel
            file={file}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearImage={handleClearImage}
            labels={getImageToTextPreviewLabels()}
            showCompareToggle={false}
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          />
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!extractedText}
            canApply={!!file}
            actionsPlacement="top"
            applyLabel={IMAGE_TO_TEXT_COPY.extractButton}
            applyingLabel={IMAGE_TO_TEXT_COPY.extractingButton}
            description={IMAGE_TO_TEXT_COPY.subtitle}
            descriptionEndLabel="Copy the extracted text"
            onApply={handleExtract}
          >
            {extractedText && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Heading as="h4">{IMAGE_TO_TEXT_COPY.resultHeading}</Heading>
                  <Button variant={copied ? 'secondary' : 'primary'} size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" /> {IMAGE_TO_TEXT_COPY.copiedButton}
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> {IMAGE_TO_TEXT_COPY.copyButton}
                      </>
                    )}
                  </Button>
                </div>
                <Textarea value={extractedText} rows={10} disabled />
              </div>
            )}
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
