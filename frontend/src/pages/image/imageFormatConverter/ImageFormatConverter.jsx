import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { convertImageFormat } from '../../../services/imageService';
import { validateFile, downloadBlob } from '../../../utils/fileUtils';
import { DEFAULT_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import Select from '../../../components/ui/Select';
import {
  FORMAT_CONVERTER_COPY,
  getFormatConverterDownloadFilename,
  getFormatConverterPreset,
  getFormatConverterPreviewLabels,
  getFormatConverterSubtitle,
  getFormatConverterTitle,
  getFormatOptions,
  getInitialExtFromPreset,
  isSupportedExtension,
  resolveFileExtension,
} from '../../../utils/image/imageFormatConverter/imageFormatConverterUtils';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function ImageFormatConverter({ toolName }) {
  const preset = useMemo(() => getFormatConverterPreset(toolName), [toolName]);
  const initialExt = getInitialExtFromPreset(preset);
  const initialOpts = getFormatOptions(initialExt);

  const [files, setFiles] = useState([]);
  const [targetOptions, setTargetOptions] = useState(initialOpts);
  const [currentSource, setCurrentSource] = useState(initialExt.toUpperCase());
  const [targetFormat, setTargetFormat] = useState(
    preset?.defaultTarget ?? initialOpts[0]?.value ?? ''
  );
  const [fileError, setFileError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultExt, setResultExt] = useState('');
  const [error, setError] = useState('');

  const allowMultiple = preset?.allowMultiple ?? false;
  const previewFile = files[0] ?? null;
  const title = getFormatConverterTitle(toolName, currentSource, targetFormat);
  const subtitle = getFormatConverterSubtitle(preset);

  useToolPersistence({
    toolName,
    snapshot: { files, targetFormat, resultBlob, resultExt },
    hasContent: files.length > 0 || Boolean(resultBlob),
    onRestore: (s) => {
      if (Array.isArray(s.files) && s.files.length) {
        setFiles(s.files);
        const ext = resolveFileExtension(s.files[0].name);
        if (isSupportedExtension(ext)) {
          setTargetOptions(getFormatOptions(ext));
          setCurrentSource(ext.toUpperCase());
        }
      }
      if (s.targetFormat) setTargetFormat(s.targetFormat);
      if (s.resultBlob) setResultBlob(s.resultBlob);
      if (typeof s.resultExt === 'string') setResultExt(s.resultExt);
    },
  });

  const resetTargets = () => {
    setTargetOptions(initialOpts);
    setCurrentSource(initialExt.toUpperCase());
    setTargetFormat(preset?.defaultTarget ?? initialOpts[0]?.value ?? '');
    setFileError('');
  };

  const handleFiles = (newFiles) => {
    setResultBlob(null);
    setResultExt('');
    setError('');

    if (!newFiles?.length) {
      setFiles([]);
      resetTargets();
      return;
    }

    const ext = resolveFileExtension(newFiles[0].name);
    if (!isSupportedExtension(ext)) {
      setFileError(FORMAT_CONVERTER_COPY.unsupportedError(ext));
      setFiles([]);
      setTargetOptions([]);
      return;
    }

    setFileError('');
    const opts = getFormatOptions(ext);
    setFiles(newFiles);
    setTargetOptions(opts);
    setCurrentSource(ext.toUpperCase());
    setTargetFormat((current) => {
      const keep = opts.find((o) => o.value === current);
      return keep ? current : (opts[0]?.value ?? '');
    });
  };

  const handleClearImage = () => {
    setFiles([]);
    setResultBlob(null);
    setResultExt('');
    setError('');
    resetTargets();
  };

  const handleConvert = async () => {
    if (!files.length) {
      setError(FORMAT_CONVERTER_COPY.noFileError);
      return;
    }
    if (fileError) {
      setError(fileError);
      return;
    }
    if (!targetFormat) {
      setError(FORMAT_CONVERTER_COPY.noTargetError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      files.forEach((f) => validateFile(f, { maxSizeMB: DEFAULT_MAX_SIZE_MB }));
      const { data, ext } = await convertImageFormat(files, targetFormat);
      setResultBlob(data);
      setResultExt(ext);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !previewFile) return;
    downloadBlob(
      resultBlob,
      getFormatConverterDownloadFilename(previewFile.name, resultExt || targetFormat)
    );
  };

  return (
    <ImageToolPage title={title} subtitle={subtitle} error={error || fileError}>
      <ImageToolWorkspace
        showOptions={!!previewFile}
        isProcessing={isProcessing}
        preview={
          <ImageToolPreviewPanel
            file={previewFile}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearImage={handleClearImage}
            labels={getFormatConverterPreviewLabels()}
            accept={preset?.accept ?? '.jpg,.jpeg,.png,.webp,.gif,.tif,.tiff,.eps'}
            multiple={allowMultiple}
            showCompareToggle={!allowMultiple}
            renderLoader={() => (
              <ImageLoader
                fileName={previewFile?.name}
                fileSize={formatFileSize(previewFile?.size)}
                targetFormat={targetFormat?.toUpperCase()}
              />
            )}
          />
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            canApply={!!previewFile && !!targetFormat && !fileError}
            hasResult={!!resultBlob}
            applyLabel={FORMAT_CONVERTER_COPY.convertButton}
            applyingLabel={FORMAT_CONVERTER_COPY.convertingButton}
            downloadLabel={FORMAT_CONVERTER_COPY.downloadButton}
            completeMessage={FORMAT_CONVERTER_COPY.completeMessage}
            description={subtitle}
            onApply={handleConvert}
            onDownload={handleDownload}
            showDownload
          >
            <Select
              label={FORMAT_CONVERTER_COPY.selectLabel}
              options={targetOptions}
              value={targetFormat}
              onChange={(e) => {
                setTargetFormat(e.target.value);
                setResultBlob(null);
                setResultExt('');
              }}
              disabled={!targetOptions.length}
              error={fileError}
            />

            {fileError && <p className="text-xs text-red-500">{fileError}</p>}
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}

ImageFormatConverter.propTypes = {
  toolName: PropTypes.string,
};
