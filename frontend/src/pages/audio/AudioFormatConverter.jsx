import { useRef, useState } from 'react';
import { Music } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import AudioPreviewPanel from '../../components/toolPreview/AudioPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import Select from '../../components/ui/Select';
import AudioLoader from '../../components/loaders/AudioLoader';
import { convertAudioFormat } from '../../services/audioService';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { AUDIO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { formatAudioFileSize } from '../../utils/audio/audioFileUtils';
import {
  AUDIO_SOURCE_FORMAT,
  AUDIO_FORMAT_MAP,
  SUPPORTED_AUDIO_EXTENSIONS,
} from '../../constants/audioConstants';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';

function getOptions(sourceExt) {
  return Object.keys(AUDIO_FORMAT_MAP[sourceExt] ?? {})
    .filter((ext) => ext !== 'mp4')
    .map((ext) => ({ value: ext, label: `.${ext.toUpperCase()}` }));
}

export default function AudioFormatConverter({ toolName }) {
  const preset = AUDIO_SOURCE_FORMAT[toolName];
  const initialExt = (preset?.accept ?? '').split(',')[0].replace('.', '');
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
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName,
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
        const restored = restoreFile(s.file, s.fileName);
        if (restored) {
          setFile(restored);
          applied = true;
        }
      }
      if (s.resultBlob) {
        setResultBlob(s.resultBlob);
        applied = true;
      }
      if (applied) return true;
    },
  });

  const dynamicTitle =
    currentSource && currentTarget
      ? `${currentSource} to ${currentTarget.toUpperCase()}`
      : (toolName ?? 'Audio Format Converter');

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      const ext = nextFile.name.split('.').pop().toLowerCase();
      if (!SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
        setError(`".${ext}" is not supported. Please upload an M4A, OGG or AAC file.`);
        return;
      }
      try {
        validateFile(nextFile, { maxSizeMB: AUDIO_MAX_SIZE_MB, allowedTypes: ['audio/'] });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFile(nextFile);
    setResultBlob(null);
    setError('');
    if (!nextFile) return;

    const ext = nextFile.name.split('.').pop().toLowerCase();
    const opts = getOptions(ext);
    setTargetOptions(opts);
    setCurrentSource(ext.toUpperCase());
    setCurrentTarget((current) => {
      const hasTarget = opts.some((o) => o.value === current);
      return hasTarget ? current : (opts[0]?.value ?? '');
    });
  };

  const handleClearFile = () => {
    conversionRef.current += 1;
    setFile(null);
    setResultBlob(null);
    setError('');
    setTargetOptions(initialOpts);
    setCurrentSource(initialExt.toUpperCase());
    setCurrentTarget(preset?.defaultTarget ?? initialOpts[0]?.value ?? '');
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload a file first.');
      return;
    }
    if (!currentTarget) {
      setError('No valid target format available for this file type.');
      return;
    }
    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const blob = await convertAudioFormat(file, currentTarget);
      if (conversionRef.current !== requestId) return;
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
    const base = file.name.replace(/\.[^/.]+$/, '');
    downloadBlob(resultBlob, `${base}.${currentTarget}`);
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <AudioLoader fileName="" targetFormat={currentTarget.toUpperCase()} />
      </div>
    );
  }

  return (
    <ToolPageLayout
      title={dynamicTitle}
      subtitle="Convert your audio to another format"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your audio file' },
                { text: 'Choose the output format' },
                { text: 'Download the converted audio' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <AudioPreviewPanel
            file={file}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={preset?.accept ?? '.m4a,.ogg,.aac'}
            uploadIcon={Music}
            uploadTitle="Drag & drop your audio"
            uploadSubtitle={`Accepted: ${preset?.accept ?? '.m4a, .ogg, .aac'} · Max 100 MB`}
            renderLoader={() => (
              <AudioLoader
                fileName={file?.name ?? ''}
                fileSize={formatAudioFileSize(file?.size)}
                targetFormat={currentTarget.toUpperCase()}
              />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert Audio"
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

AudioFormatConverter.propTypes = {
  toolName: PropTypes.string,
};
