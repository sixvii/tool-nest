import { useState } from 'react';
import { Video } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import ToolGuide from '../../components/toolLayout/ToolGuide';
import VideoPreviewPanel from '../../components/toolPreview/VideoPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import VideoLoader from '../../components/loaders/VideoLoader';
import { compressMovVideo, compressAviVideo, compressMkvVideo } from '../../services/videoService';
import { COMPRESSOR_CONFIG } from '../../constants/videoConstants';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { VIDEO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';

const FN_MAP = {
  'Compress MOV': compressMovVideo,
  'Compress AVI': compressAviVideo,
  'Compress MKV': compressMkvVideo,
};

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoCompressor({ toolName }) {
  const config = COMPRESSOR_CONFIG[toolName];

  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const { isRestoreSettled } = useToolPersistence({
    toolName: toolName ?? 'VideoCompressor',
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: { file, fileName: file?.name ?? '', resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
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

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      try {
        validateFile(nextFile, { maxSizeMB: VIDEO_MAX_SIZE_MB, allowedTypes: ['video/'] });
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
    setFile(null);
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
    try {
      const blob = await FN_MAP[toolName](file);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, `${file.name.replace(/\.[^/.]+$/, '')}_compressed.${config.ext}`);
  };

  const savedPercent =
    file && resultBlob ? Math.round((1 - resultBlob.size / file.size) * 100) : null;

  if (!isRestoreSettled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <VideoLoader fileName="" />
      </div>
    );
  }

  return (
    <ToolPageLayout title={toolName} subtitle="Reduce your video's file size" error={error}>
      <ToolWorkspace
        showOptions={!!file}
        variant="guide"
        secondary={
          file ? (
            <ToolGuide
              steps={[
                { text: 'Upload your video' },
                { text: 'Compress it while preserving quality' },
                { text: 'Download the smaller file' },
              ]}
            />
          ) : null
        }
        isProcessing={isProcessing}
        preview={
          <VideoPreviewPanel
            file={file}
            resultBlob={resultBlob}
            resultFileName={
              file ? `${file.name.replace(/\.[^/.]+$/, '')}_compressed.${config.ext}` : null
            }
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept={config?.accept}
            labels={{ resultLabel: 'Compressed' }}
            uploadIcon={Video}
            uploadTitle="Drag & drop your video"
            uploadSubtitle="Reduce your video's file size"
            renderLoader={() => <VideoLoader fileName={file?.name ?? ''} />}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={`Compress ${config?.ext?.toUpperCase() ?? 'Video'}`}
            applyingLabel="Compressing…"
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            {resultBlob && file && (
              <div className="flex items-center justify-center gap-3 text-xs bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                <span className="text-slate-500">{formatMB(file.size)}</span>
                <span className="text-slate-400">→</span>
                <span className="font-semibold text-emerald-700">{formatMB(resultBlob.size)}</span>
                {savedPercent !== null && (
                  <span className="text-emerald-600 font-bold">({savedPercent}% smaller)</span>
                )}
              </div>
            )}
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

VideoCompressor.propTypes = {
  toolName: PropTypes.string,
};
