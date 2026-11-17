import { useState } from 'react';
import { applyBorderToImage } from '../../../utils/image/addBorder/addBorderCanvas';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../../utils/apiError';
import { useToolPersistence } from '../../../hooks/useToolPersistence';
import {
  BORDER_WIDTH_MAX,
  BORDER_WIDTH_MIN,
  normalizeHexColor,
} from '../../../utils/image/addBorder/borderStyleUtils';
import ImageToolPage from '../../../components/toolLayout/ToolPageLayout';
import ImageToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import ImageToolPreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import {
  ADD_BORDER_COPY,
  ADD_BORDER_DEFAULTS,
} from '../../../constants/image/addBorder/addBorderConstants';
import {
  getAddBorderDownloadFilename,
  getAddBorderPreviewLabels,
} from '../../../utils/image/addBorder/addBorderPageUtils';
import ImageToolOptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../../components/toolOptions/OptionsPanelSection';
import OptionsPanelRangeSlider from '../../../components/toolOptions/OptionsPanelRangeSlider';
import Heading from '../../../components/ui/Heading';
import { BORDER_STYLES } from '../../../constants/image/imageConstants';
import BorderStyleChip from './components/BorderStyleChip';
import BorderLivePreview from './components/BorderLivePreview';
import FittedImagePreview from '../../../components/toolPreview/FittedImagePreview';
import ImageLoader from '../../../components/loaders/ImageLoader';
import { formatFileSize } from '../../../utils/image/imageFileUtils';

export default function AddBorder() {
  const [file, setFile] = useState(null);
  const [borderWidth, setBorderWidth] = useState(ADD_BORDER_DEFAULTS.borderWidth);
  const [borderStyle, setBorderStyle] = useState(ADD_BORDER_DEFAULTS.borderStyle);
  const [colorHex, setColorHex] = useState(ADD_BORDER_DEFAULTS.colorHex);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const previewColor = normalizeHexColor(colorHex);

  useToolPersistence({
    snapshot: { file, borderWidth, borderStyle, colorHex, resultBlob },
    hasContent: Boolean(file) || Boolean(resultBlob),
    onRestore: (s) => {
      if (s.file) setFile(s.file);
      if (typeof s.borderWidth === 'number') setBorderWidth(s.borderWidth);
      if (s.borderStyle) setBorderStyle(s.borderStyle);
      if (s.colorHex) setColorHex(s.colorHex);
      if (s.resultBlob) setResultBlob(s.resultBlob);
    },
  });

  const clearResult = () => setResultBlob(null);

  const handleFiles = (newFiles) => {
    const nextFile = newFiles[0] ?? null;
    if (nextFile) {
      try {
        validateFile(nextFile, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setFile(nextFile);
    clearResult();
    setError('');
  };

  const handleClearImage = () => {
    setFile(null);
    clearResult();
    setError('');
    setBorderWidth(ADD_BORDER_DEFAULTS.borderWidth);
    setBorderStyle(ADD_BORDER_DEFAULTS.borderStyle);
    setColorHex(ADD_BORDER_DEFAULTS.colorHex);
  };

  const handleBorderWidthChange = (value) => {
    setBorderWidth(value);
    clearResult();
  };

  const handleStyleChange = (value) => {
    setBorderStyle(value);
    clearResult();
  };

  const handleColorChange = (value) => {
    setColorHex(value);
    clearResult();
  };

  const handleApply = async () => {
    if (!file) {
      setError(ADD_BORDER_COPY.noFileError);
      return;
    }
    if (!borderWidth || borderWidth < BORDER_WIDTH_MIN) {
      setError(ADD_BORDER_COPY.invalidWidthError);
      return;
    }

    setError('');
    setIsProcessing(true);
    try {
      const blob = await applyBorderToImage(file, borderWidth, previewColor, borderStyle);
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !file) return;
    downloadBlob(resultBlob, getAddBorderDownloadFilename(file.name));
  };

  const renderPreview = ({ viewOriginal, hasResult }) => {
    if (!file) return null;
    if (!hasResult || viewOriginal) {
      return (
        <BorderLivePreview
          file={file}
          borderWidth={borderWidth}
          borderColor={previewColor}
          borderStyle={borderStyle}
        />
      );
    }
    return <FittedImagePreview source={resultBlob} alt="Bordered image" />;
  };

  return (
    <ImageToolPage title={ADD_BORDER_COPY.title} subtitle={ADD_BORDER_COPY.subtitle} error={error}>
      <ImageToolWorkspace
        showOptions={!!file}
        isProcessing={isProcessing}
        preview={
          <ImageToolPreviewPanel
            file={file}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearImage={handleClearImage}
            labels={getAddBorderPreviewLabels()}
            showCompareToggle
            renderLoader={() => (
              <ImageLoader fileName={file?.name} fileSize={formatFileSize(file?.size)} />
            )}
          >
            {renderPreview}
          </ImageToolPreviewPanel>
        }
        options={
          <ImageToolOptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel={ADD_BORDER_COPY.applyButton}
            applyingLabel={ADD_BORDER_COPY.applyingButton}
            downloadLabel={ADD_BORDER_COPY.downloadButton}
            completeMessage={ADD_BORDER_COPY.completeMessage}
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <OptionsPanelSection>
              <Heading as="h4" className="mb-4">
                {ADD_BORDER_COPY.settingsHeading}
              </Heading>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 block">
                    {ADD_BORDER_COPY.styleLabel}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                    {BORDER_STYLES.map((style) => (
                      <BorderStyleChip
                        key={style.id}
                        style={style}
                        active={borderStyle === style.id}
                        color={previewColor}
                        onSelect={() => handleStyleChange(style.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <OptionsPanelRangeSlider
                    label={ADD_BORDER_COPY.widthLabel}
                    value={borderWidth}
                    min={BORDER_WIDTH_MIN}
                    max={BORDER_WIDTH_MAX}
                    labelClassName="text-xs font-bold text-slate-400 uppercase tracking-wide"
                    valueClassName="text-sm font-bold text-slate-700"
                    onChange={handleBorderWidthChange}
                  />
                  <div className="relative mt-2">
                    <input
                      type="number"
                      min={BORDER_WIDTH_MIN}
                      max={BORDER_WIDTH_MAX}
                      value={borderWidth}
                      onChange={(e) => handleBorderWidthChange(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      px
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">
                    {ADD_BORDER_COPY.colorLabel}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={previewColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            </OptionsPanelSection>
          </ImageToolOptionsPanel>
        }
      />
    </ImageToolPage>
  );
}
