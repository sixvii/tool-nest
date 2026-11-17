import { useRef, useState } from 'react';
import { Video } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import VideoPreviewPanel from '../../components/toolPreview/VideoPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../components/toolOptions/OptionsPanelSection';
import AudioPreviewPlayer from '../../components/AudioPreviewPlayer';
import AudioLoader from '../../components/loaders/AudioLoader';
import { convertAudioFormat } from '../../services/audioService';
import { validateFile, downloadBlob, restoreFile, isRestorableBlob } from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { formatAudioFileSize } from '../../utils/audio/audioFileUtils';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';
import {
  AUDIO_FORMAT_MAP,
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_VIDEO_EXTENSIONS,
} from '../../constants/audioConstants';
import { AUDIO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

export default function VideoToAudioConverter({ toolName }) {
  const [, preferredTarget] = toolName.toLowerCase().split(' to ');

  const [file, setFile] = useState(null);
  const [availableTargets, setAvailableTargets] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(preferredTarget);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName,
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: {
      file,
      fileName: file?.name ?? '',
      selectedTarget,
      availableTargets,
      resultBlob,
    },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        const restoredFile = restoreFile(s.file, s.fileName);
        setFile(restoredFile);
        applied = true;
        const ext = restoredFile.name.split('.').pop()?.toLowerCase() ?? '';
        if (AUDIO_FORMAT_MAP[ext]) {
          setAvailableTargets(Object.keys(AUDIO_FORMAT_MAP[ext]));
        } else if (Array.isArray(s.availableTargets) && s.availableTargets.length) {
          setAvailableTargets(s.availableTargets);
        }
      } else if (Array.isArray(s.availableTargets) && s.availableTargets.length) {
        setAvailableTargets(s.availableTargets);
      }
      if (s.selectedTarget) setSelectedTarget(s.selectedTarget);
      if (s.resultBlob) {
        setResultBlob(s.resultBlob);
        applied = true;
      }
      if (applied) return true;
    },
  });

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      const actualExt = nextFile.name.split('.').pop().toLowerCase();

      if (!ACCEPTED_VIDEO_EXTENSIONS.has(actualExt)) {
        setError(
          `".${actualExt}" is not supported. Please upload a video file (MP4, MOV, MKV, WEBM, AVI).`
        );
        return;
      }
      if (!AUDIO_FORMAT_MAP[actualExt]) {
        setError(`No audio conversion available for .${actualExt}.`);
        return;
      }
      try {
        validateFile(nextFile, { maxSizeMB: AUDIO_MAX_SIZE_MB, allowedTypes: ['video/'] });
      } catch (err) {
        setError(err.message);
        return;
      }

      const targets = Object.keys(AUDIO_FORMAT_MAP[actualExt]);
      const defaultTarget = targets.includes(preferredTarget) ? preferredTarget : targets[0];
      setAvailableTargets(targets);
      setSelectedTarget(defaultTarget);
    }
    setFile(nextFile);
    setResultBlob(null);
    setError('');
  };

  const handleClearFile = () => {
    conversionRef.current += 1;
    setFile(null);
    setAvailableTargets([]);
    setSelectedTarget(preferredTarget);
    setResultBlob(null);
    setIsProcessing(false);
    setError('');
  };

  const handleTargetSelect = (target) => {
    setSelectedTarget(target);
    setResultBlob(null);
    setError('');
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload a video first.');
      return;
    }
    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const blob = await convertAudioFormat(file, selectedTarget);
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
    const outputFileName = file.name.replace(/\.[^.]+$/, '') + '.' + selectedTarget;
    downloadBlob(resultBlob, outputFileName);
  };

  const actualExt = file?.name.split('.').pop().toLowerCase() ?? '';

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <AudioLoader fileName="" targetFormat={selectedTarget.toUpperCase()} />
      </div>
    );
  }

  return (
    <ToolPageLayout title={toolName} subtitle="Convert your video to an audio file" error={error}>
      <ToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <VideoPreviewPanel
            file={file}
            resultBlob={resultBlob}
            resultFileName={file ? `${file.name.replace(/\.[^.]+$/, '')}.${selectedTarget}` : null}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={ACCEPTED_VIDEO_TYPES}
            labels={{ resultLabel: 'Converted Audio' }}
            uploadIcon={Video}
            uploadTitle="Drag & drop your video"
            uploadSubtitle="Convert your video to an audio file"
            renderResultPlayer={({ src, disabled }) => (
              <AudioPreviewPlayer src={src} disabled={disabled} />
            )}
            renderLoader={() => (
              <AudioLoader
                fileName={file?.name}
                fileSize={formatAudioFileSize(file?.size)}
                targetFormat={selectedTarget.toUpperCase()}
              />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={`Convert to ${selectedTarget.toUpperCase()}`}
            applyingLabel="Converting..."
            downloadLabel="Download"
            description="Convert your video to an audio file"
            descriptionStartLabel="Upload your video"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelSection
              title="Output Format"
              hint={`${actualExt.toUpperCase()} will be converted to your chosen audio format`}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-slate-100 text-slate-600 uppercase">
                  {actualExt}
                </span>
                <span className="text-slate-400 text-sm font-medium">→</span>
                <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-600 text-white uppercase shadow-md shadow-blue-600/20">
                  {selectedTarget}
                </span>
              </div>

              {availableTargets.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {availableTargets.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={selectedTarget === t}
                      onClick={() => handleTargetSelect(t)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all
                        ${
                          selectedTarget === t
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-blue-300'
                        }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </OptionsPanelSection>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

VideoToAudioConverter.propTypes = {
  toolName: PropTypes.string.isRequired,
};
