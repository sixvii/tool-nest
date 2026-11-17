import { useRef, useState } from 'react';
import { Video, Crosshair } from 'lucide-react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import VideoPreviewPanel from '../../components/toolPreview/VideoPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import VideoLoader from '../../components/loaders/VideoLoader';
import Input from '../../components/ui/Input';
import { trimVideo, cutEdgesVideo } from '../../services/videoService';
import { validateFile, downloadBlob, isRestorableBlob, restoreFile } from '../../utils/fileUtils';
import { VIDEO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { TRIMMER_TABS } from '../../constants/videoConstants';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';

function formatDuration(duration) {
  if (duration == null) return null;
  return new Date(duration * 1000).toISOString().substring(11, 19);
}

export default function VideoTrimmer({ toolName }) {
  const [activeTab, setActiveTab] = useState(TRIMMER_TABS[0]);
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(null);
  const videoRef = useRef(null);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [frontCut, setFrontCut] = useState('');
  const [backCut, setBackCut] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [resultExt, setResultExt] = useState(null);
  const [error, setError] = useState('');

  const isTrimTab = activeTab === TRIMMER_TABS[0];

  const hasTrimInput =
    Boolean(startTime.trim()) || Boolean(endTime.trim()) || Boolean(frontCut) || Boolean(backCut);

  const { isRestoreSettled } = useToolPersistence({
    toolName: toolName ?? 'VideoTrimmer',
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: {
      activeTab,
      file,
      fileName: file?.name ?? '',
      startTime,
      endTime,
      frontCut,
      backCut,
      resultBlob,
      resultExt,
    },
    hasContent: Boolean(file) || Boolean(resultBlob) || hasTrimInput,
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (s.activeTab) setActiveTab(s.activeTab);
      if (typeof s.startTime === 'string') setStartTime(s.startTime);
      if (typeof s.endTime === 'string') setEndTime(s.endTime);
      if (typeof s.frontCut === 'string') setFrontCut(s.frontCut);
      if (typeof s.backCut === 'string') setBackCut(s.backCut);
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
    setDuration(null);
    setResultBlob(null);
    setResultExt(null);
    setError('');
  };

  const handleClearFile = () => {
    setFile(null);
    setDuration(null);
    setResultBlob(null);
    setResultExt(null);
    setError('');
    setStartTime('');
    setEndTime('');
    setFrontCut('');
    setBackCut('');
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
      const ext = file.name.split('.').pop().toLowerCase();
      const blob = isTrimTab
        ? await trimVideo(file, startTime, endTime)
        : await cutEdgesVideo(file, Number.parseFloat(frontCut), Number.parseFloat(backCut));
      setResultBlob(blob);
      setResultExt(ext);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, `result_${isTrimTab ? 'trimmed' : 'cut'}.${resultExt}`);
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
      title={toolName ?? 'Trim & Cut Video'}
      subtitle="Trim a clip or cut its edges"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <VideoPreviewPanel
            file={file}
            resultBlob={resultBlob}
            resultFileName={
              resultExt ? `result_${isTrimTab ? 'trimmed' : 'cut'}.${resultExt}` : null
            }
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept=".mp4,.mov,.avi,.mkv,.webm"
            videoRef={videoRef}
            onLoadedMetadata={(video) => setDuration(video.duration ?? null)}
            duration={formatDuration(duration)}
            labels={{ resultLabel: isTrimTab ? 'Trimmed Result' : 'Cut Result' }}
            uploadIcon={Video}
            uploadTitle="Drag & drop your video"
            uploadSubtitle="Trim a clip or cut its edges"
            renderLoader={() => <VideoLoader fileName={file?.name ?? ''} duration={duration} />}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={isTrimTab ? 'Trim Video' : 'Cut Edges'}
            applyingLabel="Processing..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
            tabs={TRIMMER_TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          >
            <div className="mt-4 space-y-4">
              {isTrimTab ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      label="Start Time"
                      placeholder="e.g. 00:00:10 or 10"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setResultBlob(null);
                      }}
                    />
                    {file && (
                      <button
                        type="button"
                        onClick={() => {
                          setStartTime(videoRef.current?.currentTime?.toFixed(2) ?? '');
                          setResultBlob(null);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg py-1.5 transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        Set from player
                      </button>
                    )}
                  </div>
                  <div>
                    <Input
                      label="End Time"
                      placeholder="e.g. 00:00:30 or 30"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        setResultBlob(null);
                      }}
                    />
                    {file && (
                      <button
                        type="button"
                        onClick={() => {
                          setEndTime(videoRef.current?.currentTime?.toFixed(2) ?? '');
                          setResultBlob(null);
                        }}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg py-1.5 transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        Set from player
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {duration !== null && (
                    <p className="text-xs text-slate-500 text-center font-medium">
                      Total Duration: {formatDuration(duration)}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Cut from Start (sec)"
                      type="number"
                      placeholder="e.g. 10"
                      value={frontCut}
                      onChange={(e) => {
                        setFrontCut(e.target.value);
                        setResultBlob(null);
                      }}
                    />
                    <Input
                      label="Cut from End (sec)"
                      type="number"
                      placeholder="e.g. 20"
                      value={backCut}
                      onChange={(e) => {
                        setBackCut(e.target.value);
                        setResultBlob(null);
                      }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">
                {isTrimTab
                  ? 'Use HH:MM:SS format or plain seconds. End time must be greater than start. Or play the video and tap "Set from player" to capture the current position.'
                  : 'Enter seconds to remove from the beginning and end of the video.'}
              </p>
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

VideoTrimmer.propTypes = {
  toolName: PropTypes.string,
};
