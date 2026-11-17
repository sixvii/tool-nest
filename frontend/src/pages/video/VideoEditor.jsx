import { useState } from 'react';
import { Video } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import VideoPreviewPanel from '../../components/toolPreview/VideoPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import VideoLoader from '../../components/loaders/VideoLoader';
import FileUpload from '../../components/ui/FileUpload';
import RestoreSessionBanner from '../../components/RestoreSessionBanner';
import { compressVideo, addSubtitles, muteVideo } from '../../services/videoService';
import { EDITOR_TABS, EDITOR_TOOL_TAB_MAP } from '../../constants/videoConstants';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { VIDEO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage, parseBackendError } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';

function getButtonLabel(activeTab) {
  if (activeTab === 'Compress') return 'Compress Video';
  if (activeTab === 'Subtitles') return 'Add Subtitles';
  return 'Mute Video';
}

function crfLabel(crf) {
  if (crf <= 17) return 'Near Lossless';
  if (crf <= 23) return 'High Quality';
  if (crf <= 28) return 'Good Quality';
  if (crf <= 35) return 'Medium Quality';
  return 'Smaller File';
}

const RESULT_LABEL = { Compress: 'Compressed', Subtitles: 'With Subtitles', Mute: 'Muted' };

const TAB_DESCRIPTION = {
  Compress: 'Lower the CRF for better quality, or raise it for a smaller file size.',
  Mute: 'Remove all audio tracks from your video while keeping the same format.',
};

export default function VideoEditor({ toolName }) {
  const [activeTab, setActiveTab] = useState(() => EDITOR_TOOL_TAB_MAP[toolName] ?? 'Compress');
  const [crf, setCrf] = useState(28);
  const [srtFile, setSrtFile] = useState(null);

  const [file, setFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultExt, setResultExt] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const { isRestoreSettled, sessionRestored, dismissSession, clearSession } = useToolPersistence({
    toolName: toolName ?? 'VideoEditor',
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: {
      activeTab,
      crf,
      srtFile,
      file,
      fileName: file?.name ?? '',
      resultBlob,
      resultExt,
    },
    hasContent: Boolean(file) || Boolean(resultBlob) || Boolean(srtFile),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (s.activeTab) setActiveTab(s.activeTab);
      if (typeof s.crf === 'number') setCrf(s.crf);
      if (isRestorableBlob(s.srtFile)) setSrtFile(s.srtFile);
      if (isRestorableBlob(s.file)) {
        setFile(restoreFile(s.file, s.fileName));
        applied = true;
      }
      if (s.resultBlob) {
        setResultBlob(s.resultBlob);
        if (typeof s.resultExt === 'string') setResultExt(s.resultExt);
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
    setResultExt(null);
    setError('');
  };

  const handleClearFile = () => {
    setFile(null);
    setResultBlob(null);
    setResultExt(null);
    setError('');
    setSrtFile(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setResultBlob(null);
    setResultExt(null);
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
      let blob;
      let ext;
      if (activeTab === 'Compress') {
        blob = await compressVideo(file, crf);
        ext = 'mp4';
      } else if (activeTab === 'Subtitles') {
        if (!srtFile) throw new Error('Please upload an SRT subtitle file.');
        blob = await addSubtitles(file, srtFile);
        ext = 'mkv';
      } else {
        blob = await muteVideo(file);
        ext = file.name.split('.').pop().toLowerCase();
      }
      setResultBlob(blob);
      setResultExt(ext);
    } catch (err) {
      const message = err?.isAxiosError ? await parseBackendError(err) : clientErrorMessage(err);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    const suffix = RESULT_LABEL[activeTab].toLowerCase().replace(' ', '_');
    downloadBlob(resultBlob, `${file.name.replace(/\.[^/.]+$/, '')}_${suffix}.${resultExt}`);
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
      title={toolName ?? 'Edit Video'}
      subtitle="Compress, add subtitles, or mute your video"
      error={error}
    >
      {sessionRestored && file && (
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
        isProcessing={isProcessing}
        preview={
          <VideoPreviewPanel
            file={file}
            resultBlob={resultBlob}
            resultFileName={
              file && resultExt
                ? `${file.name.replace(/\.[^/.]+$/, '')}_${RESULT_LABEL[activeTab]
                    .toLowerCase()
                    .replace(' ', '_')}.${resultExt}`
                : null
            }
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept=".mp4,.mov,.avi,.mkv,.webm"
            labels={{ resultLabel: RESULT_LABEL[activeTab] }}
            uploadIcon={Video}
            uploadTitle="Drag & drop your video"
            uploadSubtitle="Compress, add subtitles, or mute your video"
            renderLoader={() => <VideoLoader fileName={file?.name ?? ''} />}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={getButtonLabel(activeTab)}
            applyingLabel="Processing..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
            tabs={EDITOR_TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            description={TAB_DESCRIPTION[activeTab] ?? null}
            descriptionStartLabel="Upload your video"
          >
            <div className="mt-4">
              {activeTab === 'Compress' && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Better Quality</span>
                    <span className="font-bold text-slate-700">
                      CRF {crf} · {crfLabel(crf)}
                    </span>
                    <span>Smaller File</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={51}
                    value={crf}
                    onChange={(e) => {
                      setCrf(Number(e.target.value));
                      setResultBlob(null);
                    }}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-slate-400 text-center">
                    Output will be .mp4. Lower CRF = better quality, larger file.
                  </p>
                </div>
              )}

              {activeTab === 'Subtitles' && (
                <div className="space-y-4">
                  <FileUpload
                    label="Subtitle File (.srt)"
                    accept=".srt"
                    multiple={false}
                    onFiles={(files) => {
                      setSrtFile(files[0] ?? null);
                      setResultBlob(null);
                    }}
                  />
                  <p className="text-xs text-slate-400 text-center">
                    Subtitles are embedded as soft subs. Output will be .mkv.
                  </p>
                </div>
              )}

              {activeTab === 'Mute' && (
                <p className="text-xs text-slate-400 text-center">
                  All audio tracks will be removed. Output keeps the same format as the input file.
                </p>
              )}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

VideoEditor.propTypes = {
  toolName: PropTypes.string,
};
