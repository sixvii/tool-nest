import { useState } from 'react';
import ToolPageLayout from '../../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../../components/toolLayout/ToolWorkspace';
import OptionsPanel from '../../../components/toolOptions/OptionsPanel';
import OptionsPanelSection from '../../../components/toolOptions/OptionsPanelSection';
import ImagePreviewPanel from '../../../components/toolPreview/ImagePreviewPanel';
import FileUpload from '../../../components/ui/FileUpload';
import { combineImages } from '../../../services/imageService';
import {
  downloadBlob,
  buildDerivedFilename,
  createPreviewURL,
  validateFile,
} from '../../../utils/fileUtils';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';
import {
  COLLAGE_LAYOUTS,
  ICON_MAP,
} from '../../../constants/image/collageMaker/collageMakerConstants';

export default function CollageMaker() {
  const [files, setFiles] = useState([]);
  const [layout, setLayout] = useState('grid');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState(null);
  const [error, setError] = useState('');

  const handleFiles = (newFiles) => {
    try {
      newFiles.forEach((f) =>
        validateFile(f, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] })
      );
    } catch (err) {
      setError(err.message);
      return;
    }
    setFiles(newFiles);
    setResultBlob(null);
    setError('');
  };

  const handleClearImage = () => {
    setFiles([]);
    setResultBlob(null);
    setError('');
  };

  const handleGenerate = async () => {
    if (files.length < 2) {
      setError('Please upload at least 2 images to create a collage.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const blob = await combineImages(files, layout);
      setResultBlob(blob);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, buildDerivedFilename('collage', { suffix: layout, extension: 'jpg' }));
  };

  return (
    <ToolPageLayout
      title="Collage Maker"
      subtitle="Combine multiple images into a single professional collage layout"
      error={error}
    >
      <ToolWorkspace
        preview={
          <ImagePreviewPanel
            file={files && files.length > 0 ? files[0] : null}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearImage={handleClearImage}
            multiple={true}
            showCompareToggle={true}
            onDownload={null}
            downloadLabel="Download Collage"
          >
            {({ hasResult }) =>
              !hasResult && files.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {files.length} {files.length === 1 ? 'image' : 'images'} selected
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[35vh] overflow-y-auto pr-2">
                    {files.map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="relative group overflow-hidden rounded-lg bg-slate-100 aspect-square flex-shrink-0"
                      >
                        <img
                          src={createPreviewURL(file)}
                          alt={`Selected thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            }
          </ImagePreviewPanel>
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            canApply={files.length >= 2}
            applyLabel="Generate Collage"
            applyingLabel="Generating..."
            downloadLabel="Download Collage"
            showApply={true} // Fixed: Keeps the generate button visible so you can remake it anytime
            showDownload={!!resultBlob} // Keeps download button active in options card
            onApply={handleGenerate}
            onDownload={handleDownload}
          >
            <OptionsPanelSection title="Upload Source Assets">
              <FileUpload
                label="Select Images (minimum 2)"
                accept="image/*"
                multiple={true}
                onFiles={handleFiles}
              />
              {files.length === 1 && (
                <p className="text-xs text-amber-500 font-medium mt-2 ml-1">
                  Add at least one more image to create a collage.
                </p>
              )}
              {files.length >= 2 && (
                <p className="text-xs text-emerald-500 font-medium mt-2 ml-1">
                  {files.length} images selected ✓
                </p>
              )}
            </OptionsPanelSection>

            <OptionsPanelSection title="Choose Layout Blueprint">
              <div className="grid grid-cols-3 gap-3">
                {COLLAGE_LAYOUTS.map((l) => {
                  const IconComponent = ICON_MAP[l.icon];
                  const isSelected = layout === l.value;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLayout(l.value)}
                      disabled={isProcessing}
                      className={`py-4 px-3 rounded-xl text-sm font-bold border transition-all
                                flex flex-col items-center gap-2
                                ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-50'
                                }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span>{l.label}</span>
                      <span
                        className={`text-[10px] font-normal ${
                          isSelected ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {l.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </OptionsPanelSection>
          </OptionsPanel>
        }
        showOptions={files.length > 0}
        isProcessing={isProcessing}
      />
    </ToolPageLayout>
  );
}
