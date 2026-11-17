import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import ToolPageLayout from '../../components/toolLayout/ToolPageLayout';
import ToolWorkspace from '../../components/toolLayout/ToolWorkspace';
import PdfPreviewPanel from '../../components/toolPreview/PdfPreviewPanel';
import OptionsPanel from '../../components/toolOptions/OptionsPanel';
import { useToolPersistence } from '../../hooks/useToolPersistence';
import PdfLoader from '../../components/loaders/PdfLoader';
import { esignPdf } from '../../services/pdfService';
import { downloadBlob, stripFileExtension, validateFile } from '../../utils/fileUtils';
import { PDF_MAX_SIZE_MB } from '../../constants/fileSizeLimits';
import { clientErrorMessage } from '../../utils/apiError';
import { Input } from '../../components/ui';
import { ESIGN_MODES, SIGNATURE_FONTS } from '../../constants/pdf-constants/esignConstants';
import { useEsignFonts } from '../../hooks/pdf/useEsignFonts';

// ─── Draw Canvas ──────────────────────────────────────────────────────────────
function DrawCanvas({ onSave }) {
  const canvasRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] ?? e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(30, 41, 80, 0.82)';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawing(true);
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
    onSave(null);
  };

  const save = () => {
    canvasRef.current.toBlob((blob) => onSave(blob), 'image/png');
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">Draw your signature</p>
        <button onClick={clear} className="text-[10px] text-rose-400 hover:text-rose-600">
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white cursor-crosshair touch-none"
        style={{ height: 120 }}
      />
      {hasDrawing && (
        <button
          onClick={save}
          className="w-full py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Use this signature
        </button>
      )}
    </div>
  );
}

DrawCanvas.propTypes = {
  onSave: PropTypes.func.isRequired,
};

// ─── Signature Preview ────────────────────────────────────────────────────────
function SignaturePreview({ text, fontFamily, fontSize }) {
  if (!text) return null;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      <div className="px-3 pt-2 flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-widest text-slate-300 uppercase">
          Preview
        </span>
      </div>
      <div className="flex items-end justify-start px-4 py-3 min-h-[72px]">
        <div className="relative w-full">
          <span
            style={{
              fontFamily,
              fontSize: fontSize * 1.6,
              color: 'rgba(30, 41, 80, 0.85)',
              display: 'block',
              lineHeight: 1.1,
            }}
          >
            {text}
          </span>
          <div
            className="mt-1"
            style={{
              height: 1.5,
              background: 'linear-gradient(to right, rgba(30,41,80,0.4), transparent)',
              borderRadius: 1,
            }}
          />
        </div>
      </div>
      <div className="px-3 pb-2 flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full border border-slate-200 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300 opacity-60" />
        </div>
        <span className="text-[9px] text-slate-300">Digitally signed</span>
      </div>
    </div>
  );
}

SignaturePreview.propTypes = {
  text: PropTypes.string,
  fontFamily: PropTypes.string,
  fontSize: PropTypes.number,
};

// ─── Placement Grid ───────────────────────────────────────────────────────────
function PlacementGrid({ position, onChange }) {
  const GRID = [
    ['top-left', 'top-center', 'top-right'],
    ['middle-left', 'middle-center', 'middle-right'],
    ['bottom-left', 'bottom-center', 'bottom-right'],
  ];
  const POSITION_XY = {
    'top-left': { x: 0.05, y: 0.05 },
    'top-center': { x: 0.4, y: 0.05 },
    'top-right': { x: 0.75, y: 0.05 },
    'middle-left': { x: 0.05, y: 0.45 },
    'middle-center': { x: 0.4, y: 0.45 },
    'middle-right': { x: 0.75, y: 0.45 },
    'bottom-left': { x: 0.05, y: 0.85 },
    'bottom-center': { x: 0.4, y: 0.85 },
    'bottom-right': { x: 0.75, y: 0.85 },
  };
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-slate-500 mb-2">Placement</p>
      <div className="flex items-center gap-4">
        <div className="grid grid-cols-3 gap-1 w-24">
          {GRID.map((row) =>
            row.map((pos) => (
              <button
                key={pos}
                onClick={() => onChange(pos, POSITION_XY[pos])}
                className={`w-7 h-7 rounded-md border-2 transition-colors
                ${position === pos ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}
              />
            ))
          )}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Click to position ·<br />
          bottom recommended
        </p>
      </div>
    </div>
  );
}

PlacementGrid.propTypes = {
  position: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EsignPdf({ toolName }) {
  useEsignFonts();

  const [currentFile, setCurrentFile] = useState(null);
  const [resultBlob, setResultBlob] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('text');
  const [signText, setSignText] = useState('');
  const [signFont, setSignFont] = useState(SIGNATURE_FONTS[0].key);
  const [fontSize, setFontSize] = useState(24);
  const [drawBlob, setDrawBlob] = useState(null);
  const [uploadImg, setUploadImg] = useState(null);
  const [cert, setCert] = useState(null);
  const [password, setPassword] = useState('');
  const [posKey, setPosKey] = useState('bottom-right');
  const [coords, setCoords] = useState({ x: 0.75, y: 0.85 });
  const [page, setPage] = useState(1);

  useToolPersistence({
    namespace: 'esign-settings',
    snapshot: {
      mode,
      signText,
      signFont,
      fontSize,
      drawBlob,
      uploadImg,
      cert,
      password,
      posKey,
      coords,
      page,
    },
    hasContent: Boolean(currentFile) || Boolean(signText.trim()) || Boolean(uploadImg),
    onRestore: (s) => {
      if (s.mode) setMode(s.mode);
      if (typeof s.signText === 'string') setSignText(s.signText);
      if (s.signFont) setSignFont(s.signFont);
      if (typeof s.fontSize === 'number') setFontSize(s.fontSize);
      if (s.drawBlob) setDrawBlob(s.drawBlob);
      if (s.uploadImg) setUploadImg(s.uploadImg);
      if (s.cert) setCert(s.cert);
      if (typeof s.password === 'string') setPassword(s.password);
      if (s.posKey) setPosKey(s.posKey);
      if (s.coords) setCoords(s.coords);
      if (typeof s.page === 'number') setPage(s.page);
    },
  });

  const selectedFont = SIGNATURE_FONTS.find((f) => f.key === signFont) ?? SIGNATURE_FONTS[0];

  const handlePlacement = (key, xy) => {
    setPosKey(key);
    setCoords(xy);
    setResultBlob(null);
  };

  const handleFiles = (newFiles) => {
    const file = newFiles?.[0] ?? null;
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
    const formData = {
      x: String(coords.x),
      y: String(coords.y),
      page: String(page),
      signature_type: mode,
    };
    if (mode === 'certificate') {
      if (!cert) {
        setError('Please upload a .p12 certificate.');
        return;
      }
      formData.password = password;
    } else if (mode === 'text') {
      if (!signText.trim()) {
        setError('Enter your signature text.');
        return;
      }
      formData.signature_text = signText;
      formData.signature_font = signFont;
      formData.font_size = String(fontSize);
    } else if (mode === 'draw') {
      if (!drawBlob) {
        setError('Please draw your signature first.');
        return;
      }
    } else if (mode === 'image') {
      if (!uploadImg) {
        setError('Please upload a signature image.');
        return;
      }
    }
    let sigImage;
    if (mode === 'draw') {
      sigImage = drawBlob;
    } else if (mode === 'image') {
      sigImage = uploadImg;
    }
    setError('');
    setIsProcessing(true);
    try {
      const data = await esignPdf(currentFile, cert, formData, sigImage);
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

  return (
    <ToolPageLayout title={toolName} subtitle="Add a signature to your PDF" error={error}>
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
            uploadTitle="Drag & drop your PDF"
            uploadSubtitle="Add a signature to your PDF"
            renderLoader={() => (
              <PdfLoader fileName={currentFile?.name ?? ''} operationLabel="Signing PDF" />
            )}
          />
        }
        options={
          <OptionsPanel
            isProcessing={isProcessing}
            hasResult={!!resultBlob}
            applyLabel="Sign PDF"
            applyingLabel="Signing..."
            downloadLabel="Download"
            onApply={handleApply}
            onDownload={handleDownload}
            showDownload
          >
            <div className="flex gap-1.5 mt-2">
              {ESIGN_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    setResultBlob(null);
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors
                    ${mode === m.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'text' && (
              <div className="mt-3 space-y-2">
                <Input
                  label="Your name"
                  placeholder="e.g. John Smith"
                  value={signText}
                  onChange={(e) => {
                    setSignText(e.target.value);
                    setResultBlob(null);
                  }}
                />

                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Font style</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SIGNATURE_FONTS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => {
                          setSignFont(f.key);
                          setResultBlob(null);
                        }}
                        title={f.label}
                        className={`py-2 px-1 text-sm rounded-lg border-2 transition-all text-center leading-none
                          ${
                            signFont === f.key
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 bg-white hover:border-blue-300'
                          }`}
                        style={{ fontFamily: f.family, minHeight: 40 }}
                      >
                        <span style={{ fontFamily: f.family, fontSize: signText ? 16 : 10 }}>
                          {signText || f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="esign-font-size" className="text-xs text-slate-500">
                      Size
                    </label>
                    <span className="text-[11px] font-semibold text-slate-600">{fontSize}px</span>
                  </div>
                  <input
                    id="esign-font-size"
                    type="range"
                    min={14}
                    max={48}
                    value={fontSize}
                    onChange={(e) => {
                      setFontSize(Number(e.target.value));
                      setResultBlob(null);
                    }}
                    className="w-full accent-blue-500"
                  />
                </div>

                <SignaturePreview
                  text={signText}
                  fontFamily={selectedFont.family}
                  fontSize={fontSize}
                />
              </div>
            )}

            {mode === 'draw' && (
              <DrawCanvas
                onSave={(blob) => {
                  setDrawBlob(blob);
                  setResultBlob(null);
                }}
              />
            )}

            {mode === 'image' && (
              <div className="mt-3 space-y-2">
                <label htmlFor="esign-image-input" className="text-xs text-slate-500 mb-1 block">
                  Upload signature image
                </label>
                <input
                  id="esign-image-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setUploadImg(e.target.files?.[0] || null);
                    setResultBlob(null);
                  }}
                  className="text-xs text-slate-600 w-full border border-slate-200 rounded-lg px-3 py-2"
                />
                {uploadImg && (
                  <img
                    src={URL.createObjectURL(uploadImg)}
                    alt="sig"
                    className="h-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
                  />
                )}
              </div>
            )}

            {mode === 'certificate' && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Upload .p12 Certificate</p>
                  <input
                    type="file"
                    accept=".p12"
                    onChange={(e) => {
                      setCert(e.target.files?.[0] || null);
                      setResultBlob(null);
                    }}
                    className="text-xs text-slate-600 w-full border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
                <Input
                  label="Certificate password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setResultBlob(null);
                  }}
                  placeholder="Enter password"
                />
              </div>
            )}

            {mode !== 'certificate' && (
              <>
                <PlacementGrid position={posKey} onChange={handlePlacement} />
                <div className="mt-4">
                  <label
                    htmlFor="esign-page-input"
                    className="text-xs font-medium text-slate-500 mb-1 block"
                  >
                    Page
                  </label>
                  <input
                    id="esign-page-input"
                    type="number"
                    min={1}
                    value={page}
                    onChange={(e) => {
                      setPage(Number(e.target.value));
                      setResultBlob(null);
                    }}
                    className="w-20 text-center text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </>
            )}
          </OptionsPanel>
        }
      />
    </ToolPageLayout>
  );
}

EsignPdf.propTypes = {
  toolName: PropTypes.string.isRequired,
};
