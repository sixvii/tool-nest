import { useRef, useState } from 'react';
import { Video, Check } from 'lucide-react';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import VideoPreviewPanel from '../../components/toolPreview/VideoPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import AudioPreviewPlayer from '../../components/AudioPreviewPlayer';
import AudioLoader from '../../components/loaders/AudioLoader';
import RestoreSessionBanner from '../../components/RestoreSessionBanner';
import { extractAudio } from '../../services/audioService';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { clientErrorMessage } from '../../utils/apiError';
import { formatAudioFileSize } from '../../utils/audio/audioFileUtils';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';
import {
  ACCEPTED_VIDEO_TYPES,
  ACCEPTED_VIDEO_EXTENSIONS,
  DEFAULT_EXTRACT_FORMAT,
  EXTRACT_FORMAT_OPTIONS,
} from '../../constants/audioConstants';
import { AUDIO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';

export default function AudioExtractor() {
  const [file, setFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(DEFAULT_EXTRACT_FORMAT);
  const [error, setError] = useState('');
  const extractionRef = useRef(0);

  const { isRestoreSettled, sessionRestored, dismissSession, clearSession } = useToolPersistence({
    toolName: 'AudioExtractor',
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: { file, fileName: file?.name ?? '', selectedFormat, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        setFile(restoreFile(s.file, s.fileName));
        applied = true;
      }
      if (s.selectedFormat) setSelectedFormat(s.selectedFormat);
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
      const ext = nextFile.name.split('.').pop().toLowerCase();
      if (!ACCEPTED_VIDEO_EXTENSIONS.has(ext)) {
        setError(
          `".${ext}" is not supported. Please upload a video file (MP4, MOV, MKV, WEBM, AVI).`
        );
        return;
      }
      try {
        validateFile(nextFile, { maxSizeMB: AUDIO_MAX_SIZE_MB, allowedTypes: ['video/'] });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFile(nextFile);
    setResultBlob(null);
    setError('');
    setSelectedFormat(DEFAULT_EXTRACT_FORMAT);
  };

  const handleClearFile = () => {
    extractionRef.current += 1;
    setFile(null);
    setResultBlob(null);
    setIsProcessing(false);
    setError('');
    setSelectedFormat(DEFAULT_EXTRACT_FORMAT);
  };

  const handleFormatSelect = (value) => {
    setSelectedFormat(value);
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
    const requestId = ++extractionRef.current;
    try {
      const blob = await extractAudio(file, selectedFormat);
      if (extractionRef.current !== requestId) return;
      setResultBlob(blob);
    } catch (err) {
      if (extractionRef.current !== requestId) return;
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const outputFileName = file.name.replace(/\.[^.]+$/, '') + '.' + selectedFormat;
    downloadBlob(resultBlob, outputFileName);
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <AudioLoader fileName="" targetFormat={selectedFormat.toUpperCase()} />
      </div>
    );
  }

  return (
    <ToolPageLayout
      title="Convert Video to Audio"
      subtitle="Extract audio from your video"
      error={error}
    >
      {sessionRestored && (file || resultBlob) && (
        <RestoreSessionBanner
          className="mb-4"
          onContinue={dismissSession}
          onDiscard={() => {
            clearSession();
            handleClearFile();
          }}
        />
      )}
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your video' },
                { text: 'Choose an audio format and quality' },
                { text: 'Download the extracted audio' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <VideoPreviewPanel
            file={file}
            resultBlob={resultBlob}
            resultFileName={file ? `${file.name.replace(/\.[^.]+$/, '')}.${selectedFormat}` : null}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={ACCEPTED_VIDEO_TYPES}
            labels={{ resultLabel: 'Extracted Audio' }}
            uploadIcon={Video}
            uploadTitle="Drag & drop your video"
            uploadSubtitle="Extract audio from your video"
            renderResultPlayer={({ src, disabled }) => (
              <AudioPreviewPlayer src={src} disabled={disabled} />
            )}
            renderLoader={() => (
              <AudioLoader
                fileName={file?.name}
                fileSize={formatAudioFileSize(file?.size)}
                targetFormat={selectedFormat.toUpperCase()}
              />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Extract audio"
            applyingLabel="Extracting..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="space-y-2">
              {EXTRACT_FORMAT_OPTIONS.map((opt) => {
                const isSelected = selectedFormat === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleFormatSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all
                      ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span
                        className={`text-xs font-bold w-10 flex-shrink-0
                        ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}
                      >
                        {opt.label}
                      </span>
                      <span
                        className={`text-sm ${isSelected ? 'text-slate-700 font-medium' : 'text-slate-400'}`}
                      >
                        {opt.description}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{opt.bitrate}</span>
                  </button>
                );
              })}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}
