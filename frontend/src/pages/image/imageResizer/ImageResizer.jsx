import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPanelCard from '../../../components/toolLayout/ToolPanelCard';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import ImagePreviewPanel from './components/ImageResizerPreview';
import { resizeImage } from '../../../services/imageService';
import { validateFile, downloadBlob, revokePreviewURL } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import {
  TABS,
  PERCENT_CHIPS,
  SOCIAL_PRESETS,
  PLATFORMS,
} from '../../../constants/image/imageConstants';
import { IMAGE_RESIZER_COPY } from '../../../constants/image/imageResizer/imageResizerConstants';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function ImageResizer() {
  const [file, setFile] = useState(null);
  const [origUrl, setOrigUrl] = useState(null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(1);

  const [tab, setTab] = useState('Custom');

  // Custom tab
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [lockAspect, setLockAspect] = useState(true);

  // Percent tab
  const [percent, setPercent] = useState(100);

  // Social tab
  const [platform, setPlatform] = useState('Facebook');
  const [preset, setPreset] = useState('');

  // Result
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resizedW, setResizedW] = useState(0);
  const [resizedH, setResizedH] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  useToolPersistence({
    snapshot: {
      file,
      origW,
      origH,
      aspectRatio,
      tab,
      width,
      height,
      lockAspect,
      percent,
      platform,
      preset,
      resultBlob,
      resizedW,
      resizedH,
    },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) {
        setFile(s.file);
        setOrigUrl(URL.createObjectURL(s.file));
        if (s.origW) setOrigW(s.origW);
        if (s.origH) setOrigH(s.origH);
        if (s.aspectRatio) setAspectRatio(s.aspectRatio);
      }
      if (s.tab) setTab(s.tab);
      if (typeof s.width === 'string') setWidth(s.width);
      if (typeof s.height === 'string') setHeight(s.height);
      if (typeof s.lockAspect === 'boolean') setLockAspect(s.lockAspect);
      if (typeof s.percent === 'number') setPercent(s.percent);
      if (s.platform) setPlatform(s.platform);
      if (typeof s.preset === 'string') setPreset(s.preset);
      if (s.resultBlob) {
        setResultBlob(s.resultBlob);
        setResultUrl(URL.createObjectURL(s.resultBlob));
        if (s.resizedW) setResizedW(s.resizedW);
        if (s.resizedH) setResizedH(s.resizedH);
      }
    },
  });

  const handleFile = (files) => {
    const f = files[0];
    if (!f) return;
    try {
      validateFile(f, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(clientErrorMessage(err));
      return;
    }
    setError('');
    setResultBlob(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setOrigUrl(url);
    const img = new Image();
    img.onload = () => {
      setOrigW(img.naturalWidth);
      setOrigH(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setWidth(String(img.naturalWidth));
      setHeight(String(img.naturalHeight));
    };
    img.src = url;
  };

  const getTargetDimensions = () => {
    if (tab === 'Custom') {
      return { w: Number(width) || 0, h: Number(height) || 0 };
    }
    if (tab === 'Percent') {
      return {
        w: Math.round((origW * percent) / 100),
        h: Math.round((origH * percent) / 100),
      };
    }
    if (tab === 'Social' && preset) {
      const found = SOCIAL_PRESETS[platform]?.find((p) => p.label === preset);
      return found ? { w: found.w, h: found.h } : { w: 0, h: 0 };
    }
    return { w: 0, h: 0 };
  };

  const { w: targetW, h: targetH } = getTargetDimensions();

  const ratioWarning =
    file && targetW > 0 && targetH > 0 && Math.abs(targetW / targetH - aspectRatio) > 0.01;

  const handleWidthChange = (val) => {
    setWidth(val);
    if (lockAspect && aspectRatio && val) setHeight(String(Math.round(Number(val) / aspectRatio)));
    revokePreviewURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
  };

  const handleHeightChange = (val) => {
    setHeight(val);
    if (lockAspect && aspectRatio && val) setWidth(String(Math.round(Number(val) * aspectRatio)));
    revokePreviewURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
  };

  const handleSwap = () => {
    setWidth(height);
    setHeight(width);
    setLockAspect(false);
    revokePreviewURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
  };

  const handleGoBack = () => {
    setWidth(String(origW));
    setHeight(String(origH));
    setPercent(100);
    setPreset('');
    revokePreviewURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
  };

  const handleResize = async () => {
    if (!targetW || !targetH || targetW < 1 || targetH < 1) {
      setError('Please set valid dimensions.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const blob = await resizeImage(file, targetW, targetH);
      revokePreviewURL(resultUrl);
      setResultBlob(blob);
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResizedW(targetW);
      setResizedH(targetH);
      setShowOriginal(false);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultBlob) downloadBlob(resultBlob, `resized-${file.name}`);
  };

  const handleNewImage = () => {
    revokePreviewURL(origUrl);
    revokePreviewURL(resultUrl);
    setFile(null);
    setOrigUrl(null);
    setResultBlob(null);
    setResultUrl(null);
    setResizedW(0);
    setResizedH(0);
    setShowOriginal(false);
    setOrigW(0);
    setOrigH(0);
    setWidth('');
    setHeight('');
    setPercent(100);
    setPreset('');
    setError('');
  };

  const handleResizeAgain = () => {
    revokePreviewURL(resultUrl);
    setResultBlob(null);
    setResultUrl(null);
    setResizedW(0);
    setResizedH(0);
    setShowOriginal(false);
    setWidth(String(origW));
    setHeight(String(origH));
    setPercent(100);
    setPreset('');
  };

  if (!file) {
    return (
      <ImageToolPage
        title={IMAGE_RESIZER_COPY.title}
        subtitle={IMAGE_RESIZER_COPY.subtitle}
        error={error}
      >
        <ImageToolPreviewPanel
          file={null}
          onFiles={handleFile}
          onClearImage={() => {}}
          labels={{ uploadLabel: IMAGE_RESIZER_COPY.uploadLabel }}
        />
      </ImageToolPage>
    );
  }

  let displayPreviewUrl;
  let displayActiveW;
  let displayActiveH;
  if (resultBlob) {
    displayPreviewUrl = showOriginal ? origUrl : resultUrl;
    displayActiveW = showOriginal ? origW : resizedW;
    displayActiveH = showOriginal ? origH : resizedH;
  } else {
    displayPreviewUrl = origUrl;
    displayActiveW = targetW || origW;
    displayActiveH = targetH || origH;
  }

  return (
    <ImageToolPage
      title={IMAGE_RESIZER_COPY.title}
      subtitle={IMAGE_RESIZER_COPY.subtitle}
      error={error}
    >
      <ImageToolWorkspace
        showOptions
        isProcessing={isProcessing}
        preview={
          <ImageToolPanelCard>
            <ImagePreviewPanel
              file={file}
              previewUrl={displayPreviewUrl}
              activeW={displayActiveW}
              activeH={displayActiveH}
              targetW={targetW}
              targetH={targetH}
              origW={origW}
              origH={origH}
              isProcessing={isProcessing}
              hasResult={!!resultBlob}
              showCompare={!!resultBlob}
              showOriginal={showOriginal}
              onSelectView={setShowOriginal}
              onFiles={handleFile}
              onClearImage={handleNewImage}
              secondaryResultAction={
                resultBlob ? (
                  <Button variant="ghost" onClick={handleResizeAgain}>
                    Resize again
                  </Button>
                ) : null
              }
              renderLoader={() => (
                <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
              )}
            />
          </ImageToolPanelCard>
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            canApply={targetW > 0 && targetH > 0}
            hasResult={!!resultBlob}
            applyLabel="Resize image"
            applyingLabel="Resizing..."
            onApply={handleResize}
            onDownload={handleDownload}
            showDownload
          >
            <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    revokePreviewURL(resultUrl);
                    setResultBlob(null);
                    setResultUrl(null);
                  }}
                  className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${
                    tab === t
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Custom tab */}
            {tab === 'Custom' && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Width
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      px
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      role="switch"
                      aria-checked={lockAspect}
                      tabIndex={0}
                      onClick={() => setLockAspect(!lockAspect)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setLockAspect(!lockAspect);
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                        lockAspect ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          lockAspect ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                    <span className="text-sm text-slate-600 font-medium">Lock aspect ratio</span>
                  </div>
                  <button
                    onClick={handleSwap}
                    className="flex items-center gap-1 text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Swap
                  </button>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Height
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      px
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Percent tab */}
            {tab === 'Percent' && (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-5xl font-black text-slate-900">{percent}</span>
                  <span className="text-2xl font-bold text-slate-400 ml-1">%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={percent}
                  onChange={(e) => {
                    setPercent(Number(e.target.value));
                    revokePreviewURL(resultUrl);
                    setResultBlob(null);
                    setResultUrl(null);
                  }}
                  className="w-full accent-blue-600"
                />
                <p className="text-xs text-slate-400">Preview reflects shape, not scale.</p>
                <div className="flex gap-2">
                  {PERCENT_CHIPS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPercent(p);
                        revokePreviewURL(resultUrl);
                        setResultBlob(null);
                        setResultUrl(null);
                      }}
                      className={`flex-1 text-sm font-bold py-2 rounded-lg border transition-all ${
                        percent === p
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Social tab */}
            {tab === 'Social' && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Social Media Platform
                  </p>
                  <select
                    value={platform}
                    onChange={(e) => {
                      setPlatform(e.target.value);
                      setPreset('');
                      revokePreviewURL(resultUrl);
                      setResultBlob(null);
                      setResultUrl(null);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                    Preset Type
                  </p>
                  <select
                    value={preset}
                    onChange={(e) => {
                      setPreset(e.target.value);
                      revokePreviewURL(resultUrl);
                      setResultBlob(null);
                      setResultUrl(null);
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Select preset...</option>
                    {SOCIAL_PRESETS[platform].map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Ratio warning */}
            {ratioWarning && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <span className="text-amber-500 flex-shrink-0">⚠</span>
                <p className="text-sm text-amber-700 font-medium leading-snug">
                  Target ratio differs from original — the image will be stretched.
                </p>
              </div>
            )}

            {/* Go back to original */}
            <button
              onClick={handleGoBack}
              className="text-sm text-slate-400 hover:text-blue-600 transition-colors text-left"
            >
              ↩ Go back to original size
            </button>

            {/* New size */}
            {targetW > 0 && targetH > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">New size</span>
                <span className="text-sm font-bold text-slate-700">
                  {targetW} × {targetH}
                </span>
              </div>
            )}
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
