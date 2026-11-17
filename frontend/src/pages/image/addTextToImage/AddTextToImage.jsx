import { useState, useRef, useEffect } from 'react';
import { Card, Button, Alert, Badge } from '../../../components/ui';
import { downloadBlob, validateFile } from '../../../utils/fileUtils';
import { addTextToImage } from '../../../services/addTextToImageService';
import { IMAGE_MAX_SIZE_MB } from '../../../constants/fileSizeLimits';

const FONT_OPTIONS = [
  { label: 'Arial', value: "'ToolNest Arial', sans-serif" },
  { label: 'Georgia', value: "'ToolNest Georgia', serif" },
  { label: 'Times New Roman', value: "'ToolNest Times New Roman', serif" },
  { label: 'Courier New', value: "'ToolNest Courier New', monospace" },
  { label: 'Verdana', value: "'ToolNest Verdana', sans-serif" },
  { label: 'Impact', value: "'ToolNest Impact', sans-serif" },
  { label: 'Comic Sans MS', value: "'ToolNest Comic Sans MS', cursive" },
];

let boxIdCounter = 0;
const nextBoxId = () => `box-${Date.now()}-${boxIdCounter++}`;

export default function AddTextToImage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [resultPreview, setResultPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const previewContainerRef = useRef(null);
  const imgPreviewRef = useRef(null);
  const boxElRefs = useRef(new Map());
  const textSpanRefs = useRef(new Map());
  const [imgDimensions, setImgDimensions] = useState({ width: 800, height: 600 });

  const [textBoxes, setTextBoxes] = useState([]);
  const [selectedBoxId, setSelectedBoxId] = useState(null);
  const selectedBox = textBoxes.find((b) => b.id === selectedBoxId) || null;

  const moveStartRef = useRef(null);
  const [isMovingBox, setIsMovingBox] = useState(false);

  const [panelPos, setPanelPos] = useState({ x: 24, y: 120 });
  const panelDragStartRef = useRef(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handlePanelHeaderMouseDown = (e) => {
    e.preventDefault();
    panelDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panelX: panelPos.x,
      panelY: panelPos.y,
    };
    setIsDraggingPanel(true);
  };

  //  floating panel be moved with the keyboard
  const handlePanelHeaderKeyDown = (e) => {
    const step = e.shiftKey ? 30 : 10;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPanelPos((prev) => ({ ...prev, x: Math.max(0, prev.x - step) }));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPanelPos((prev) => ({ ...prev, x: prev.x + step }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPanelPos((prev) => ({ ...prev, y: Math.max(0, prev.y - step) }));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPanelPos((prev) => ({ ...prev, y: prev.y + step }));
    }
  };

  useEffect(() => {
    if (!isDraggingPanel) return;
    const handleMove = (e) => {
      const start = panelDragStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.mouseX;
      const dy = e.clientY - start.mouseY;
      setPanelPos({
        x: Math.max(0, start.panelX + dx),
        y: Math.max(0, start.panelY + dy),
      });
    };
    const handleUp = () => setIsDraggingPanel(false);
    globalThis.addEventListener('mousemove', handleMove);
    globalThis.addEventListener('mouseup', handleUp);
    return () => {
      globalThis.removeEventListener('mousemove', handleMove);
      globalThis.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPanel]);

  const updateSelectedBox = (changes) => {
    setTextBoxes((prev) => prev.map((b) => (b.id === selectedBoxId ? { ...b, ...changes } : b)));
  };

  // Shared helper so drag/move effects
  const updateBoxById = (id, changes) => {
    setTextBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  };

  // "Add Text" button in the top bar
  const handleAddText = () => {
    const el = imgPreviewRef.current;
    const width = el?.clientWidth || 400;
    const height = el?.clientHeight || 300;
    const newBox = {
      id: nextBoxId(),
      x: width / 2,
      y: height / 2,
      text: 'Your Text',
      color: '#ffffff',
      fontFamily: FONT_OPTIONS[0].value,
      fontSize: 32,
      rotation: 0,
    };
    setTextBoxes((prev) => [...prev, newBox]);
    setSelectedBoxId(newBox.id);
  };

  // "Remove" button in the top bar
  const handleRemoveSelected = () => {
    if (!selectedBoxId) return;
    setTextBoxes((prev) => prev.filter((b) => b.id !== selectedBoxId));
    setSelectedBoxId(null);
  };

  const handleDuplicateSelected = () => {
    if (!selectedBox) return;
    const copy = { ...selectedBox, id: nextBoxId(), x: selectedBox.x + 20, y: selectedBox.y + 20 };
    setTextBoxes((prev) => [...prev, copy]);
    setSelectedBoxId(copy.id);
  };

  // selected text box be nudged with the keyboard
  const handleBoxKeyDown = (e, box) => {
    const step = e.shiftKey ? 20 : 5;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      updateBoxById(box.id, { x: Math.max(0, box.x - step) });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      updateBoxById(box.id, { x: box.x + step });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      updateBoxById(box.id, { y: Math.max(0, box.y - step) });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      updateBoxById(box.id, { y: box.y + step });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedBoxId(box.id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      setTextBoxes((prev) => prev.filter((b) => b.id !== box.id));
      if (selectedBoxId === box.id) setSelectedBoxId(null);
    }
  };

  // Drag a text box on the canvas to reposition it
  const handleBoxPointerDown = (e, box) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedBoxId(box.id);
    moveStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: box.x,
      boxY: box.y,
      id: box.id,
    };
    setIsMovingBox(true);
  };

  useEffect(() => {
    if (!isMovingBox) return;
    const handleMove = (e) => {
      const el = imgPreviewRef.current;
      const start = moveStartRef.current;
      if (!el || !start) return;
      const dx = e.clientX - start.mouseX;
      const dy = e.clientY - start.mouseY;
      const x = Math.max(0, Math.min(start.boxX + dx, el.clientWidth));
      const y = Math.max(0, Math.min(start.boxY + dy, el.clientHeight));
      updateBoxById(start.id, { x, y });
    };
    const handleUp = () => setIsMovingBox(false);
    globalThis.addEventListener('mousemove', handleMove);
    globalThis.addEventListener('mouseup', handleUp);
    return () => {
      globalThis.removeEventListener('mousemove', handleMove);
      globalThis.removeEventListener('mouseup', handleUp);
    };
  }, [isMovingBox]);

  // Clicking anywhere outside a text box deselects it
  useEffect(() => {
    if (!selectedBoxId) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-textbox]') && !e.target.closest('[data-properties-panel]')) {
        setSelectedBoxId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBoxId]);

  //  adjust the UI for devices
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    try {
      validateFile(selectedFile, { maxSizeMB: IMAGE_MAX_SIZE_MB, allowedTypes: ['image/'] });
    } catch (err) {
      setError(err.message);
      return;
    }
    setFile(selectedFile);
    setResultPreview(null);
    setError('');
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);

    const img = new Image();
    img.onload = () => {
      setImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;

    setTextBoxes([]);
    setSelectedBoxId(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleApply = async () => {
    if (!file) {
      setError('Please upload an image.');
      return;
    }
    const boxesWithText = textBoxes.filter((b) => b.text.trim());
    if (boxesWithText.length === 0) {
      setError('Please add some text to the image.');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const el = imgPreviewRef.current;
      const imgBoundingRect = el.getBoundingClientRect();

      const imgAspect = imgDimensions.width / imgDimensions.height;
      const containerAspect = imgBoundingRect.width / imgBoundingRect.height;

      let renderedWidth, renderedHeight, offsetX, offsetY;
      if (imgAspect > containerAspect) {
        renderedWidth = imgBoundingRect.width;
        renderedHeight = imgBoundingRect.width / imgAspect;
        offsetX = 0;
        offsetY = (imgBoundingRect.height - renderedHeight) / 2;
      } else {
        renderedHeight = imgBoundingRect.height;
        renderedWidth = imgBoundingRect.height * imgAspect;
        offsetX = (imgBoundingRect.width - renderedWidth) / 2;
        offsetY = 0;
      }

      const scale = imgDimensions.height / renderedHeight;
      let currentFile = file;

      for (const box of boxesWithText) {
        const boxEl = boxElRefs.current.get(box.id);
        const boxRect = boxEl.getBoundingClientRect();

        const centerScreenX = boxRect.left + boxRect.width / 2;
        const centerScreenY = boxRect.top + boxRect.height / 2;

        const localX = centerScreenX - imgBoundingRect.left - offsetX;
        const localY = centerScreenY - imgBoundingRect.top - offsetY;

        const x = Math.round((localX / renderedWidth) * imgDimensions.width);
        const y = Math.round((localY / renderedHeight) * imgDimensions.height);

        const scaledFontSize = Math.max(8, Math.round(box.fontSize * scale));
        const fontLabel = FONT_OPTIONS.find((f) => f.value === box.fontFamily)?.label || 'Arial';

        const blob = await addTextToImage({
          file: currentFile,
          text: box.text,
          x,
          y,
          fontSize: scaledFontSize,
          color: box.color,
          rotation: box.rotation,
          fontFamily: fontLabel,
        });
        currentFile = new File([blob], file.name, { type: blob.type || file.type });
      }
      setResultPreview(URL.createObjectURL(currentFile));
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultPreview) return;
    fetch(resultPreview)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, `text-${file.name}`));
  };

  return (
    <div className="flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2 text-center">
        Add Text to Image
      </h1>
      <p className="text-slate-400 mb-6 sm:mb-10 text-sm sm:text-base text-center px-2">
        Upload an image, add custom text and download the result
      </p>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        <Card padding="lg">
          <div className="text-center mb-4 sm:mb-6">
            <Badge>Workspace Mode</Badge>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Add Text to Image
            </h2>
          </div>

          {/* File Upload */}
          {file ? (
            <div className="w-full border-2 border-emerald-400 bg-emerald-50/20 rounded-2xl px-4 py-4 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-emerald-700 truncate">{file.name}</span>

              <div className="flex gap-2 flex-shrink-0">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />

                <Button variant="secondary" size="sm" onClick={() => inputRef.current.click()}>
                  Change
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setResultPreview(null);
                  }}
                >
                  Remove Image
                </Button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="imageUpload"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`w-full p-8 border-2 border-dashed rounded-2xl flex flex-col items-center
              justify-center gap-2 cursor-pointer transition-all
              ${
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300 bg-slate-50/50'
              }`}
            >
              <input
                id="imageUpload"
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />

              <p className="text-sm font-medium text-slate-600 text-center">
                <span className="text-blue-600 font-bold">Browse</span> or drag &amp; drop an image
              </p>

              <p className="text-xs text-slate-400">JPG, PNG, WEBP supported</p>
            </label>
          )}

          {/* Top action bar: Add Text / Remove */}
          {preview && !resultPreview && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleAddText}>
                Add Text
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedBoxId}
                onClick={handleRemoveSelected}
              >
                Remove
              </Button>
            </div>
          )}

          {/* Canvas preview with draggable text boxes */}
          {preview && !resultPreview && (
            <div className="mt-4 flex justify-center">
              <div ref={previewContainerRef} className="relative inline-block max-w-full">
                <img
                  ref={imgPreviewRef}
                  src={preview}
                  alt="original"
                  className="w-full max-h-[70vh] mx-auto rounded-xl border border-slate-100 object-contain select-none"
                  draggable={false}
                />

                {textBoxes.map((box) => {
                  const isThisSelected = selectedBoxId === box.id;
                  return (
                    <button
                      key={box.id}
                      ref={(node) => {
                        if (node) boxElRefs.current.set(box.id, node);
                        else boxElRefs.current.delete(box.id);
                      }}
                      type="button"
                      data-textbox
                      aria-label={`Text box: ${box.text || 'Your Text'}`}
                      onMouseDown={(e) => handleBoxPointerDown(e, box)}
                      onKeyDown={(e) => handleBoxKeyDown(e, box)}
                      style={{
                        position: 'absolute',
                        left: box.x,
                        top: box.y,
                        transform: `translate(-50%, -50%) rotate(${box.rotation}deg)`,
                        padding: '4px 8px',
                        border: isThisSelected ? '1.5px dashed #3b82f6' : '1px dashed transparent',
                        cursor: isMovingBox ? 'grabbing' : 'grab',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        background: 'transparent',
                      }}
                    >
                      <span
                        ref={(node) => {
                          if (node) textSpanRefs.current.set(box.id, node);
                          else textSpanRefs.current.delete(box.id);
                        }}
                        style={{
                          fontSize: `${box.fontSize}px`,
                          color: box.color,
                          fontFamily: box.fontFamily,
                          fontWeight: 'bold',
                          lineHeight: 1,
                          display: 'inline-block',
                        }}
                      >
                        {box.text || 'Your Text'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isProcessing}
            disabled={!file || textBoxes.every((b) => !b.text.trim())}
            onClick={handleApply}
            className="mt-4 sm:mt-6"
          >
            {isProcessing ? 'Applying...' : 'Apply Text'}
          </Button>

          <Alert variant="error" message={error} show={!!error} className="mt-4" />
        </Card>

        {/* Result */}
        {resultPreview && (
          <Card padding="lg">
            <p className="text-sm font-semibold text-slate-700 mb-4">Result</p>
            <img
              src={resultPreview}
              alt="result"
              className="max-h-64 mx-auto rounded-xl border border-slate-100 object-contain mb-4"
            />
            <Button variant="success" size="lg" fullWidth onClick={handleDownload}>
              Download
            </Button>
          </Card>
        )}
      </div>

      {/* Floating, draggable Properties panel  */}
      {selectedBox && (
        <>
          {isMobile && (
            <button
              type="button"
              className="fixed inset-0 bg-black/30 z-40 border-none cursor-default"
              onClick={() => setSelectedBoxId(null)}
              aria-label="Close properties panel"
            />
          )}
          <div
            data-properties-panel
            style={
              isMobile
                ? {
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    top: 'auto',
                    width: '100%',
                    maxHeight: '50vh',
                    zIndex: 50,
                  }
                : {
                    position: 'fixed',
                    left: panelPos.x,
                    top: panelPos.y,
                    width: '288px',
                    zIndex: 50,
                  }
            }
            className={
              isMobile
                ? 'bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl p-4 overflow-y-auto animate-slide-up'
                : 'bg-white border border-slate-200 rounded-2xl shadow-2xl p-4'
            }
          >
            {isMobile && <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3" />}
            <div className="flex items-center justify-between mb-3 -mx-4 -mt-4 px-4 pt-4 pb-2">
              <button
                type="button"
                onMouseDown={isMobile ? undefined : handlePanelHeaderMouseDown}
                onKeyDown={isMobile ? undefined : handlePanelHeaderKeyDown}
                aria-label="Drag to move properties panel. Use arrow keys when focused."
                className={
                  isMobile
                    ? 'flex-1 text-left bg-transparent border-none p-0 text-sm font-bold text-slate-700 select-none'
                    : 'flex-1 text-left bg-transparent border-none p-0 text-sm font-bold text-slate-700 cursor-move select-none'
                }
              >
                Properties
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setSelectedBoxId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="text-box-text"
                  className="text-xs font-bold text-slate-400 uppercase mb-1 block"
                >
                  Text
                </label>
                <input
                  id="text-box-text"
                  type="text"
                  value={selectedBox.text}
                  onChange={(e) => updateSelectedBox({ text: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Your Text"
                />
              </div>

              <div>
                <label
                  htmlFor="text-box-font"
                  className="text-xs font-bold text-slate-400 uppercase mb-1 block"
                >
                  Font
                </label>
                <select
                  id="text-box-font"
                  value={selectedBox.fontFamily}
                  onChange={(e) => updateSelectedBox({ fontFamily: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="text-box-color"
                  className="text-xs font-bold text-slate-400 uppercase mb-1 block"
                >
                  Color
                </label>
                <input
                  id="text-box-color"
                  type="color"
                  value={selectedBox.color}
                  onChange={(e) => updateSelectedBox({ color: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-200 cursor-pointer p-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="text-box-size"
                    className="text-xs font-bold text-slate-400 uppercase"
                  >
                    Size
                  </label>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedBox.fontSize}px
                  </span>
                </div>
                <input
                  id="text-box-size"
                  type="range"
                  min="10"
                  max="150"
                  value={selectedBox.fontSize}
                  onChange={(e) => updateSelectedBox({ fontSize: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="text-box-rotation"
                    className="text-xs font-bold text-slate-400 uppercase"
                  >
                    Rotation
                  </label>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedBox.rotation}°
                  </span>
                </div>
                <input
                  id="text-box-rotation"
                  type="range"
                  min="0"
                  max="360"
                  value={selectedBox.rotation}
                  onChange={(e) => updateSelectedBox({ rotation: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex justify-between mt-1">
                <button
                  onClick={handleDuplicateSelected}
                  title="Duplicate"
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  ⧉
                </button>
                <button
                  onClick={handleRemoveSelected}
                  title="Delete"
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
