import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';
import { watermarkPdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { Input } from '../../components/ui';
import {
  WATERMARK_MODES,
  TRANSPARENCY_OPTIONS,
  ROTATION_OPTIONS,
  LAYER_OPTIONS,
  POSITIONS,
  POSITION_STYLE,
  ALL_POSITIONS,
} from '../../constants/pdf-constants/watermarkConstants';

// ─── Moved outside component to fix "component created during render" error ───
function WatermarkContent({ mode, imageUrl, opacity, rotation, scaledFontSize, color, text }) {
  if (mode === 'image' && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="wm"
        style={{
          maxWidth: 60,
          maxHeight: 60,
          opacity,
          transform: `rotate(${rotation}deg)`,
          objectFit: 'contain',
        }}
      />
    );
  }
  if (mode === 'text' && text) {
    return (
      <span
        style={{
          fontSize: scaledFontSize,
          color,
          opacity,
          transform: `rotate(${rotation}deg)`,
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          display: 'inline-block',
        }}
      >
        {text}
      </span>
    );
  }
  return null;
}

export default function WatermarkPdf({ toolName }) {
  const [currentFile, setCurrentFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState('48');
  const [color, setColor] = useState('#000000');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [position, setPosition] = useState('middle-center');
  const [mosaic, setMosaic] = useState(false);
  const [transparency, setTransparency] = useState('0');
  const [rotation, setRotation] = useState('0');
  const [layer, setLayer] = useState('over');
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(1);

  useToolPersistence({
    namespace: 'watermark-settings',
    snapshot: {
      mode,
      text,
      fontSize,
      color,
      imageFile,
      position,
      mosaic,
      transparency,
      rotation,
      layer,
      pageFrom,
      pageTo,
    },
    hasContent: Boolean(currentFile) || Boolean(text.trim()) || Boolean(imageFile),
    onRestore: (s) => {
      if (s.mode) setMode(s.mode);
      if (typeof s.text === 'string') setText(s.text);
      if (typeof s.fontSize === 'string') setFontSize(s.fontSize);
      if (typeof s.color === 'string') setColor(s.color);
      if (s.imageFile) setImageFile(s.imageFile);
      if (s.position) setPosition(s.position);
      if (typeof s.mosaic === 'boolean') setMosaic(s.mosaic);
      if (typeof s.transparency === 'string') setTransparency(s.transparency);
      if (typeof s.rotation === 'string') setRotation(s.rotation);
      if (s.layer) setLayer(s.layer);
      if (typeof s.pageFrom === 'number') setPageFrom(s.pageFrom);
      if (typeof s.pageTo === 'number') setPageTo(s.pageTo);
    },
  });

  useEffect(() => {
    if (!imageFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleFiles = (newFiles) => {
    const file = newFiles?.[0] || null;
    if (file) {
      try {
        validateFile(file, { maxSizeMB: PDF_MAX_SIZE_MB });
      } catch (err) {
        setError(err.message);
        return;
      }
    }
    setCurrentFile(file);
    setResultBlob(null);
    setError('');
  };

  const handleClearFile = () => {
    setCurrentFile(null);
    setResultBlob(null);
    setError('');
  };

  const handleApply = async () => {
    if (!currentFile) {
      setError('Please upload a PDF first.');
      return;
    }
    if (mode === 'text' && !text.trim()) {
      setError('Enter watermark text.');
      return;
    }
    if (mode === 'image' && !imageFile) {
      setError('Upload a watermark image.');
      return;
    }
    setError('');
    setIsProcessing(true);
    try {
      const formData = {
        text: mode === 'text' ? text : undefined,
        image: mode === 'image' ? imageFile : undefined,
        position,
        mosaic: mosaic ? 'true' : 'false',
        opacity: String(1 - Number(transparency) / 100),
        rotation,
        layer,
        font_size: fontSize,
        color_hex: color,
        page_from: String(pageFrom - 1),
        page_to: String(pageTo - 1),
      };
      const data = await watermarkPdf(currentFile, formData);
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
      setResultBlob(blob);
    } catch (err) {
      setError(clientErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultBlob || !currentFile) return;
    const baseName = stripFileExtension(currentFile.name) || 'result';
    downloadBlob(resultBlob, `${baseName}.pdf`);
  };

  const opacity = 1 - Number(transparency) / 100;
  const scaledFontSize = Math.max(8, Math.min(Number(fontSize) * 0.25, 32));
  const hasWatermark = (mode === 'text' && text.trim()) || (mode === 'image' && imageUrl);

  const wmProps = { mode, imageUrl, opacity, rotation, scaledFontSize, color, text };

  const previewOverlay = hasWatermark ? (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: layer === 'over' ? 10 : 0 }}
    >
      {mosaic ? (
        ALL_POSITIONS.map((pos) => (
          <div
            key={pos}
            style={{ position: 'absolute', inset: 0, display: 'flex', ...POSITION_STYLE[pos] }}
          >
            <WatermarkContent {...wmProps} />
          </div>
        ))
      ) : (
        <div
          style={{ position: 'absolute', inset: 0, display: 'flex', ...POSITION_STYLE[position] }}
        >
          <WatermarkContent {...wmProps} />
        </div>
      )}
    </div>
  ) : null;

  return (
    <ToolPageLayout
      title={toolName}
      subtitle="Add a text or image watermark to your PDF"
      error={error}
    >
      <ToolWorkspace
        showOptions={!!currentFile}
        isProcessing={isProcessing}
        preview={
          <PdfPreviewPanel
            file={currentFile}
            resultBlob={resultBlob}
            isProcessing={isProcessing}
            onFiles={handleFiles}
            onClearFile={handleClearFile}
            accept=".pdf"
            previewOverlay={previewOverlay}
            overlayPageRange={{ from: pageFrom, to: pageTo }}
            uploadTitle="Drag & drop your PDF"
            uploadSubtitle="Add a text or image watermark to your PDF"
            renderLoader={() => (
              <PdfLoader fileName={currentFile?.name ?? ''} operationLabel="Adding Watermark" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Add Watermark"
            applyingLabel="Applying..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="flex gap-2 mt-1">
              {WATERMARK_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    if (m.key === 'image') setRotation('0');
                    setResultBlob(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors
                    ${mode === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'text' && (
              <div className="space-y-3 mt-3">
                <Input
                  label="Text"
                  placeholder="e.g. CONFIDENTIAL"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setResultBlob(null);
                  }}
                />
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="watermark-font-size"
                      className="text-xs text-slate-500 mb-1 block"
                    >
                      Font size
                    </label>
                    <input
                      id="watermark-font-size"
                      type="number"
                      min={8}
                      max={200}
                      value={fontSize}
                      onChange={(e) => {
                        setFontSize(e.target.value);
                        setResultBlob(null);
                      }}
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="watermark-color" className="text-xs text-slate-500 mb-1 block">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="watermark-color"
                        type="color"
                        value={color}
                        onChange={(e) => {
                          setColor(e.target.value);
                          setResultBlob(null);
                        }}
                        className="h-9 w-12 cursor-pointer rounded border border-slate-200"
                      />
                      <span className="text-xs text-slate-400">{color}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mode === 'image' && (
              <div className="mt-3">
                <label
                  htmlFor="watermark-image-input"
                  className="text-xs text-slate-500 mb-1 block"
                >
                  Watermark image
                </label>
                <input
                  id="watermark-image-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setImageFile(e.target.files?.[0] || null);
                    setResultBlob(null);
                  }}
                  className="text-xs text-slate-600 w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Position</p>
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-3 gap-1 w-24">
                  {POSITIONS.map((row) =>
                    row.map((pos) => (
                      <button
                        key={pos}
                        onClick={() => {
                          setPosition(pos);
                          setMosaic(false);
                          setResultBlob(null);
                        }}
                        className={`w-7 h-7 rounded-md border-2 transition-colors
                          ${!mosaic && position === pos ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                      />
                    ))
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mosaic}
                    onChange={(e) => {
                      setMosaic(e.target.checked);
                      setResultBlob(null);
                    }}
                    className="rounded"
                  />
                  <span>Mosaic</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label
                  htmlFor="watermark-transparency"
                  className="text-xs font-medium text-slate-500 mb-1 block"
                >
                  Transparency
                </label>
                <select
                  id="watermark-transparency"
                  value={transparency}
                  onChange={(e) => {
                    setTransparency(e.target.value);
                    setResultBlob(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {TRANSPARENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="watermark-rotation"
                  className="text-xs font-medium text-slate-500 mb-1 block"
                >
                  Rotation
                </label>
                <select
                  id="watermark-rotation"
                  value={rotation}
                  disabled={mode === 'image'}
                  onChange={(e) => {
                    setRotation(e.target.value);
                    setResultBlob(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {ROTATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {mode === 'image' && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Rotation isn't supported for image watermarks yet.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Pages</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">From</span>
                  <input
                    type="number"
                    min={1}
                    value={pageFrom}
                    onChange={(e) => {
                      setPageFrom(Number(e.target.value));
                      setResultBlob(null);
                    }}
                    className="w-16 text-center text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">To</span>
                  <input
                    type="number"
                    min={1}
                    value={pageTo}
                    onChange={(e) => {
                      setPageTo(Number(e.target.value));
                      setResultBlob(null);
                    }}
                    className="w-16 text-center text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Layer</p>
              <div className="flex gap-2">
                {LAYER_OPTIONS.map((l) => (
                  <button
                    key={l.key}
                    onClick={() => {
                      setLayer(l.key);
                      setResultBlob(null);
                    }}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 transition-colors
                      ${layer === l.key ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

WatermarkPdf.propTypes = {
  toolName: PropTypes.string.isRequired,
};
