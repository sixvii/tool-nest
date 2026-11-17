import { useState } from 'react';
import { Video } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import VideoPreviewPanel from '../../components/toolPreview/VideoPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import Select from '../../components/ui/Select';
import VideoLoader from '../../components/loaders/VideoLoader';
import { convertVideoFormat } from '../../services/videoService';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { VIDEO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { SOURCE_FORMAT, FORMAT_MAP } from '../../constants/videoConstants';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';

function getOptions(sourceExt) {
  return Object.keys(FORMAT_MAP[sourceExt] ?? {}).map((ext) => ({
    value: ext,
    label: `.${ext.toUpperCase()}`,
  }));
}

export default function VideoFormatConverter({ toolName }) {
  const preset = SOURCE_FORMAT[toolName];
  const initialExt = preset?.accept.split(',')[0].replace('.', '') ?? '';
  const initialOpts = getOptions(initialExt);

  const [file, setFile] = useState(null);
  const [targetOptions, setTargetOptions] = useState(initialOpts);
  const [currentSource, setCurrentSource] = useState(initialExt.toUpperCase());
  const [currentTarget, setCurrentTarget] = useState(
    preset?.defaultTarget ?? initialOpts[0]?.value ?? ''
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const { isRestoreSettled } = useToolPersistence({
    toolName: toolName ?? 'VideoFormatConverter',
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: {
      file,
      fileName: file?.name ?? '',
      targetOptions,
      currentSource,
      currentTarget,
      resultBlob,
    },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (Array.isArray(s.targetOptions) && s.targetOptions.length) {
        setTargetOptions(s.targetOptions);
      }
      if (typeof s.currentSource === 'string') setCurrentSource(s.currentSource);
      if (typeof s.currentTarget === 'string') setCurrentTarget(s.currentTarget);
      if (isRestorableBlob(s.file)) {
        setFile(restoreFile(s.file, s.fileName));
        applied = true;
      }
      if (s.resultBlob) {
        setResultBlob(s.resultBlob);
        applied = true;
      }
      if (applied) return true;
    },
  });

  const dynamicTitle =
    file && currentSource && currentTarget
      ? `${currentSource} to ${currentTarget.toUpperCase()}`
      : (toolName ?? 'Video Format Converter');

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      try {
        validateFile(nextFile, {
          maxSizeMB: VIDEO_MAX_SIZE_MB,
          allowedTypes: ['video/', 'image/gif'],
        });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFile(nextFile);
    setResultBlob(null);
    setError('');
    if (!nextFile) return;

    const sourceExt = nextFile.name.split('.').pop().toLowerCase();
    const options = getOptions(sourceExt);
    setTargetOptions(options);
    setCurrentSource(sourceExt.toUpperCase());
    setCurrentTarget((current) => {
      const hasTarget = options.some((o) => o.value === current);
      return hasTarget ? current : (options[0]?.value ?? '');
    });
  };

  const handleClearFile = () => {
    setFile(null);
    setResultBlob(null);
    setError('');
    setTargetOptions(initialOpts);
    setCurrentSource(initialExt.toUpperCase());
    setCurrentTarget(preset?.defaultTarget ?? initialOpts[0]?.value ?? '');
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload a video first.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const blob = await convertVideoFormat(file, currentTarget);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(resultBlob, `${base}.${currentTarget}`);
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <VideoLoader fileName="" />
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={dynamicTitle}
      subtitle="Convert your video to another format"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your video file' },
                { text: 'Choose the output format' },
                { text: 'Download the converted video' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <VideoPreviewPanel
            file={file}
            resultBlob={resultBlob}
            resultFileName={file ? `${file.name.replace(/\.[^/.]+$/, '')}.${currentTarget}` : null}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={preset?.accept ?? '.mp4,.mov,.avi,.mkv,.webm,.gif'}
            uploadIcon={Video}
            uploadTitle="Drag & drop your video"
            uploadSubtitle="Convert your video to another format"
            renderLoader={() => <VideoLoader fileName={file?.name ?? ''} />}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert Video"
            applyingLabel="Converting..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <Select
              label="Convert To"
              options={targetOptions}
              value={currentTarget}
              onChange={(e) => {
                setCurrentTarget(e.target.value);
                setResultBlob(null);
              }}
            />
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

VideoFormatConverter.propTypes = {
  toolName: PropTypes.string,
};
