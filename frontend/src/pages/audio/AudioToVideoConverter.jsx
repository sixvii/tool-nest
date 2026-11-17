import { useRef, useState } from 'react';
import { Music } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import AudioPreviewPanel from '../../components/toolPreview/AudioPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import VideoPreviewPlayer from '../../components/VideoPreviewPlayer';
import AudioLoader from '../../components/loaders/AudioLoader';
import { convertAudioFormat } from '../../services/audioService';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { AUDIO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { formatAudioFileSize } from '../../utils/audio/audioFileUtils';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';
import { SUPPORTED_AUDIO_EXTENSIONS } from '../../constants/audioConstants';

export default function AudioToVideoConverter({ toolName }) {
  const [sourceExt] = toolName.toLowerCase().split(' to ');
  const targetExt = 'mp4';
  const acceptStr = `.${sourceExt}`;

  const [file, setFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const conversionRef = useRef(0);

  const { isRestoreSettled } = useToolPersistence({
    toolName,
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: { file, fileName: file?.name ?? '', resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        const restoredFile = restoreFile(s.file, s.fileName);
        if (restoredFile) {
          setFile(restoredFile);
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

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      const actualExt = nextFile.name.split('.').pop().toLowerCase();

      if (!SUPPORTED_AUDIO_EXTENSIONS.has(actualExt)) {
        setError(`".${actualExt}" is not a supported audio file.`);
        return;
      }
      if (actualExt !== sourceExt) {
        setError(`Please upload a .${sourceExt.toUpperCase()} file.`);
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
  };

  const handleClearFile = () => {
    conversionRef.current += 1;
    setFile(null);
    setResultBlob(null);
    setIsProcessing(false);
    setError('');
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload an audio file first.');
      return;
    }
    setError('');
    setIsProcessing(true);
    const requestId = ++conversionRef.current;
    try {
      const blob = await convertAudioFormat(file, targetExt);
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
    const outputFileName = file.name.replace(/\.[^.]+$/, '') + '.mp4';
    downloadBlob(resultBlob, outputFileName);
  };

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <AudioLoader fileName="" targetFormat="MP4" />
      </div>
    );
  }

  return (
    <ToolPageLayout title={toolName} subtitle="Convert your audio to a video file" error={error}>
      <ToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <AudioPreviewPanel
            file={file}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={acceptStr}
            labels={{ resultLabel: 'Converted Video' }}
            uploadIcon={Music}
            uploadTitle="Drag & drop your audio"
            uploadSubtitle={`Accepted: ${acceptStr} · Max 100MB`}
            renderResultPlayer={({ src, disabled }) => (
              <div className="w-full bg-slate-900 rounded-xl p-2">
                <VideoPreviewPlayer src={src} disabled={disabled} />
              </div>
            )}
            renderLoader={() => (
              <AudioLoader
                fileName={file?.name}
                fileSize={formatAudioFileSize(file?.size)}
                targetFormat="MP4"
              />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Convert to MP4"
            applyingLabel="Converting..."
            downloadLabel="Download"
            description="Convert your audio to a video file"
            descriptionStartLabel="Upload your audio"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="flex items-center justify-center gap-3">
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-slate-100 text-slate-600 uppercase">
                {sourceExt}
              </span>
              <span className="text-slate-400 text-sm font-medium">→</span>
              <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-blue-50 text-blue-600 uppercase border border-blue-100">
                MP4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              AAC 192kbps · black screen video
            </p>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

AudioToVideoConverter.propTypes = {
  toolName: PropTypes.string.isRequired,
};
