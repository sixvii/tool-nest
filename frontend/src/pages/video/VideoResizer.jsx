import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Download, VideoOff, Video, Link2, Unlink2 } from 'lucide-react';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import PreviewPanelHeader from '../../components/toolPreview/PreviewPanelHeader';
import PreviewPanelUpload from '../../components/toolPreview/PreviewPanelUpload';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import VideoPreviewPlayer from '../../components/VideoPreviewPlayer';
import { resizeVideo } from '../../services/videoService';
import {
  downloadBlob,
  createPreviewURL,
  revokePreviewURL,
  validateFile,
  isRestorableBlob,
  restoreFile,
} from '../../utils/fileUtils';
import { resetFileInput } from '../../utils/image/imageFileUtils';
import { VIDEO_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import { MEDIA_TOOL_STATE_TTL_MS } from '../../utils/toolStatePersistence';
import { PLATFORM_PRESETS, PREVIEWABLE_FORMATS } from '../../constants/videoConstants';
import VideoLoader from '../../components/loaders/VideoLoader';
import PropTypes from 'prop-types';

const HEADER_LABELS = {
  uploadLabel: 'Upload Video',
  previewLabel: 'Preview',
  changeImageButton: 'Change video',
  removeImageAriaLabel: 'Remove video',
};

function getVideoDimensions(file) {
  return new Promise((resolve) => {
    const url = createPreviewURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      revokePreviewURL(url);
      resolve(
        w > 0 && h > 0
          ? { width: w, height: h, fallback: false }
          : { width: 1280, height: 720, fallback: true }
      );
    };
    video.onerror = () => {
      revokePreviewURL(url);
      resolve({ width: 1280, height: 720, fallback: true });
    };
  });
}

function computeLinkedDimension(value, primary, secondary) {
  if (!secondary || !primary || Number(value) <= 0) return null;
  return String(Math.round(Number(value) / (Number(primary) / Number(secondary))));
}

function getPresetDimensions(preset, nativeSize) {
  if (preset.width !== null) return { width: String(preset.width), height: String(preset.height) };
  if (!nativeSize) return null;
  return { width: String(nativeSize.width), height: String(nativeSize.height) };
}

function computeTargetRatio(width, height) {
  return Number(width) > 0 && Number(height) > 0 ? Number(width) / Number(height) : 16 / 9;
}

function checkCanProcess(file, width, height) {
  return !!file && Number(width) > 0 && Number(height) > 0;
}

function checkIsPreviewable(videoSrc) {
  return !!videoSrc && videoSrc !== 'unsupported';
}

export default function VideoResizer({ toolName }) {
  const DEFAULT_PLATFORM = PLATFORM_PRESETS[0];
  const DEFAULT_PRESET = DEFAULT_PLATFORM.presets[0];
  const [file, setFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [nativeSize, setNativeSize] = useState(null);
  const [dimensionsFallback, setDimensionsFallback] = useState(false);
  const [activePlatform, setActivePlatform] = useState(DEFAULT_PLATFORM.platform);
  const [activePresetLabel, setActivePresetLabel] = useState(DEFAULT_PRESET.label);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [linkedRatio, setLinkedRatio] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [resultBlob, setResultBlob] = useState(null);
  const [resultName, setResultName] = useState('');

  const videoRef = useRef(null);
  const replaceInputRef = useRef(null);

  useEffect(() => {
    if (isProcessing) videoRef.current?.pause();
  }, [isProcessing]);

  const { isRestoreSettled } = useToolPersistence({
    toolName: toolName ?? 'VideoResizer',
    ttlMs: MEDIA_TOOL_STATE_TTL_MS,
    snapshot: {
      file,
      fileName: file?.name ?? '',
      nativeSize,
      dimensionsFallback,
      activePlatform,
      activePresetLabel,
      width,
      height,
      linkedRatio,
      resultName,
      resultBlob,
    },
    hasContent: Boolean(file) || Boolean(resultBlob),
    warnOnUnload: true,
    onRestore: (s) => {
      let applied = false;
      if (isRestorableBlob(s.file)) {
        const restoredFile = restoreFile(s.file, s.fileName);
        setFile(restoredFile);
        const ext = restoredFile.name.split('.').pop().toLowerCase();
        setVideoSrc(PREVIEWABLE_FORMATS.has(ext) ? createPreviewURL(restoredFile) : 'unsupported');
        applied = true;
      }
      if (s.nativeSize) setNativeSize(s.nativeSize);
      if (typeof s.dimensionsFallback === 'boolean') setDimensionsFallback(s.dimensionsFallback);
      if (s.activePlatform) setActivePlatform(s.activePlatform);
      if (s.activePresetLabel) setActivePresetLabel(s.activePresetLabel);
      if (typeof s.width === 'string') setWidth(s.width);
      if (typeof s.height === 'string') setHeight(s.height);
      if (typeof s.linkedRatio === 'boolean') setLinkedRatio(s.linkedRatio);
      if (typeof s.resultName === 'string') setResultName(s.resultName);
      if (s.resultBlob) {
        setResultBlob(s.resultBlob);
        applied = true;
      }
      if (applied) return true;
    },
  });

  const currentPlatformData = PLATFORM_PRESETS.find((p) => p.platform === activePlatform);

  const applyPreset = (preset) => {
    setResultBlob(null);
    const dims = getPresetDimensions(preset, nativeSize);
    if (dims) {
      setWidth(dims.width);
      setHeight(dims.height);
    }
  };

  const handleFiles = async (files) => {
    const f = files[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();

    try {
      validateFile(f, { maxSizeMB: VIDEO_MAX_SIZE_MB, allowedTypes: ['video/'] });
    } catch (err) {
      setError(err.message);
      return;
    }

    setFile(f);
    setResultBlob(null);
    setError('');
    setNativeSize(null);
    setDimensionsFallback(false);
    setWidth('');
    setHeight('');
    setActivePlatform(DEFAULT_PLATFORM.platform);
    setActivePresetLabel(DEFAULT_PRESET.label);
    setVideoSrc(PREVIEWABLE_FORMATS.has(ext) ? createPreviewURL(f) : 'unsupported');

    const dims = await getVideoDimensions(f);
    setNativeSize({ width: dims.width, height: dims.height });
    setWidth(dims.fallback ? String(DEFAULT_PRESET.width) : String(dims.width));
    setHeight(dims.fallback ? String(DEFAULT_PRESET.height) : String(dims.height));
    setDimensionsFallback(dims.fallback);
  };

  const handleDeselect = () => {
    setFile(null);
    setVideoSrc(null);
    setNativeSize(null);
    setDimensionsFallback(false);
    setResultBlob(null);
    setIsProcessing(false);
    setError('');
    setActivePlatform(DEFAULT_PLATFORM.platform);
    setActivePresetLabel(DEFAULT_PRESET.label);
    setWidth('');
    setHeight('');
  };

  const handleReplaceChange = (event) => {
    const picked = event.target.files;
    if (picked?.length) handleFiles(Array.from(picked));
    resetFileInput(event);
  };

  const handlePlatformChange = (platform) => {
    setActivePlatform(platform);
    const platformData = PLATFORM_PRESETS.find((p) => p.platform === platform);
    const first = platformData.presets[0];
    setActivePresetLabel(first.label);
    applyPreset(first);
  };

  const handlePresetSelect = (preset) => {
    setActivePresetLabel(preset.label);
    applyPreset(preset);
  };

  const handleDimensionChange = (dim, value) => {
    setResultBlob(null);
    setActivePresetLabel('Custom');
    const isWidth = dim === 'width';
    const [setPrimary, setSecondary, primary, secondary] = isWidth
      ? [setWidth, setHeight, width, height]
      : [setHeight, setWidth, height, width];
    setPrimary(value);
    const linked = linkedRatio ? computeLinkedDimension(value, primary, secondary) : null;
    if (linked) setSecondary(linked);
  };

  const handleRevert = () => {
    if (!nativeSize) return;
    setResultBlob(null);
    setActivePlatform(DEFAULT_PLATFORM.platform);
    setActivePresetLabel(DEFAULT_PRESET.label);
    setWidth(String(nativeSize.width));
    setHeight(String(nativeSize.height));
  };

  const targetRatio = computeTargetRatio(width, height);
  const canProcess = checkCanProcess(file, width, height);
  const isPreviewable = checkIsPreviewable(videoSrc);

  const handleProcess = async () => {
    if (!canProcess) return;
    setIsProcessing(true);
    setError('');
    setResultBlob(null);
    try {
      const evenWidth = Math.round(Number(width) / 2) * 2;
      const evenHeight = Math.round(Number(height) / 2) * 2;
      const blob = await resizeVideo(file, evenWidth, evenHeight);
      const ext = file.name.split('.').pop().toLowerCase();
      setResultBlob(blob);
      setResultName(`${file.name.replace(/\.[^/.]+$/, '')}_resized.${ext}`);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
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
      title={toolName ?? 'Resize Video'}
      subtitle="Choose a target size and preview the result before resizing"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <Card padding="lg" className="flex flex-col gap-3 min-h-[420px] lg:min-h-[600px]">
            {file && (
              <PreviewPanelHeader
                statusLabel={HEADER_LABELS.previewLabel}
                fileName={file.name}
                labels={HEADER_LABELS}
                isProcessing={isProcessing}
                replaceInputRef={replaceInputRef}
                onReplaceChange={handleReplaceChange}
                onOpenReplace={() => replaceInputRef.current?.click()}
                onClearFile={handleDeselect}
                accept=".mp4,.mov,.avi,.mkv,.webm"
              />
            )}

            <div className="flex-1 flex flex-col p-2 min-h-0">
              {!file && (
                <PreviewPanelUpload
                  labels={HEADER_LABELS}
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  multiple={false}
                  onFiles={handleFiles}
                  uploadIcon={Video}
                  uploadTitle="Drag & drop your video"
                  uploadSubtitle="Choose a target size and preview the result before resizing"
                />
              )}

              {file && isProcessing ? (
                <div className="flex-1 flex items-center justify-center min-h-0 mb-4">
                  <VideoLoader fileName={file?.name ?? ''} resolution={`${width}×${height}`} />
                </div>
              ) : (
                file && (
                  <>
                    <div className="flex-1 flex items-center justify-center min-h-0 mb-4">
                      {isPreviewable ? (
                        <div
                          className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center"
                          style={{
                            aspectRatio: targetRatio,
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: targetRatio >= 1 ? '100%' : 'auto',
                            height: targetRatio < 1 ? '100%' : 'auto',
                          }}
                        >
                          <video
                            ref={videoRef}
                            src={videoSrc}
                            className="w-full h-full object-contain"
                            preload="auto"
                            onLoadedMetadata={() => {
                              videoRef.current.currentTime = 0.001;
                            }}
                            onError={() => setVideoSrc('unsupported')}
                          >
                            <track kind="captions" />
                          </video>
                        </div>
                      ) : (
                        <div className="relative flex flex-col items-center justify-center gap-3 text-slate-400">
                          <VideoOff className="w-10 h-10 text-slate-300" />
                          <p className="text-xs font-medium text-center">
                            Preview not available for this format
                          </p>
                          <p className="text-[10px] text-slate-300 text-center">
                            The file will still be resized correctly
                          </p>
                        </div>
                      )}
                    </div>

                    {isPreviewable && (
                      <div className="bg-slate-800 rounded-xl px-3 py-2">
                        <VideoPreviewPlayer src={videoSrc} videoRef={videoRef} transportOnly />
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          </Card>
        }
        options={
          <OptionsPanel showApply={false} isProcessing={isProcessing}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Resize</h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-full truncate max-w-[110px]">
                  {activePlatform}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Resize for
                </p>
                <select
                  value={activePlatform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 transition-colors"
                >
                  {PLATFORM_PRESETS.map((p) => (
                    <option key={p.platform} value={p.platform}>
                      {p.platform}
                    </option>
                  ))}
                </select>
              </div>

              {activePlatform === 'Custom' ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Aspect ratio
                  </p>
                  <select
                    value={activePresetLabel}
                    onChange={(e) => {
                      const preset = currentPlatformData.presets.find(
                        (p) => p.label === e.target.value
                      );
                      if (preset) handlePresetSelect(preset);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 transition-colors"
                  >
                    {currentPlatformData.presets.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Placement
                  </p>
                  <select
                    value={activePresetLabel}
                    onChange={(e) => {
                      const preset = currentPlatformData.presets.find(
                        (p) => p.label === e.target.value
                      );
                      if (preset) handlePresetSelect(preset);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 transition-colors"
                  >
                    {currentPlatformData.presets.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label} — {p.ratio}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Custom size
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="resize-width" className="text-[10px] text-slate-400">
                      Width (px)
                    </label>
                    <input
                      id="resize-width"
                      type="number"
                      value={width}
                      onChange={(e) => handleDimensionChange('width', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkedRatio((v) => !v)}
                    title={linkedRatio ? 'Unlink ratio' : 'Link ratio'}
                    className="mb-0.5 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition-colors"
                  >
                    {linkedRatio ? (
                      <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Unlink2 className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="resize-height" className="text-[10px] text-slate-400">
                      Height (px)
                    </label>
                    <input
                      id="resize-height"
                      type="number"
                      value={height}
                      onChange={(e) => handleDimensionChange('height', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                {dimensionsFallback ? (
                  <p className="text-[10px] text-amber-500 mt-2 leading-relaxed">
                    Dimensions could not be detected for this format — defaulted to 1280×720. Adjust
                    manually if needed.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Output keeps the same format as the input file.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleRevert}
                disabled={!nativeSize}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Revert to original
              </button>

              {resultBlob ? (
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  onClick={() => downloadBlob(resultBlob, resultName)}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={isProcessing}
                  disabled={!canProcess || isProcessing}
                  onClick={handleProcess}
                >
                  {isProcessing ? 'Resizing...' : 'Resize Video'}
                </Button>
              )}
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

VideoResizer.propTypes = {
  toolName: PropTypes.string,
};
