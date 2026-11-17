import { useId, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  squareCropToDisplay,
  clampSquareCrop,
  SQUARE_CROP_HANDLE_SIZE,
} from '../../../../utils/image/profilePhotoMaker/profilePhotoMakerUtils';
import { getImageDisplayLayout } from '../../../../utils/image/circleCropUtils';
import { createPreviewURL, revokePreviewURL } from '../../../../utils/fileUtils';
import RoundImagePreviewFrame from '../../roundImage/components/RoundImagePreviewFrame';

const EDITOR_MAX_WIDTH = 560;
const EDITOR_MAX_HEIGHT = 420;

export default function SquareCropEditor({ file, naturalSize, crop, onCropChange }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const maskId = useId();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [stageWidth, setStageWidth] = useState(0);

  useLayoutEffect(() => {
    if (!file) return undefined;
    const url = createPreviewURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    return () => revokePreviewURL(url);
  }, [file]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const syncWidth = () => setStageWidth(stage.clientWidth);
    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [previewUrl, naturalSize.width]);

  const layout = getImageDisplayLayout(
    naturalSize.width,
    naturalSize.height,
    stageWidth || EDITOR_MAX_WIDTH,
    EDITOR_MAX_HEIGHT
  );

  const displayCrop = squareCropToDisplay(crop, layout.scale);
  const handleSize = SQUARE_CROP_HANDLE_SIZE;
  const layoutReady = stageWidth > 0 && layout.width > 0;

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDrag);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === 'move') {
      const dx = (event.clientX - drag.startX) / layout.scale;
      const dy = (event.clientY - drag.startY) / layout.scale;
      onCropChange(
        clampSquareCrop(
          { x: drag.startCrop.x + dx, y: drag.startCrop.y + dy, size: drag.startCrop.size },
          naturalSize.width,
          naturalSize.height
        )
      );
    } else if (drag.mode === 'resize') {
      const dx = (event.clientX - drag.startX) / layout.scale;
      const dy = (event.clientY - drag.startY) / layout.scale;
      const newSize = Math.max(SQUARE_CROP_HANDLE_SIZE, drag.startCrop.size + Math.max(dx, dy));
      onCropChange(
        clampSquareCrop(
          { x: drag.startCrop.x, y: drag.startCrop.y, size: newSize },
          naturalSize.width,
          naturalSize.height
        )
      );
    }
  };

  const startDrag = (event, mode) => {
    event.preventDefault();
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: { ...crop },
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDrag);
  };

  if (!file || !previewUrl || !naturalSize.width) {
    return (
      <RoundImagePreviewFrame
        heading="Square Crop Editor"
        fileName={file?.name}
        panelStyle={{ backgroundColor: '#f8fafc' }}
      >
        <p className="text-sm text-slate-500">Loading editor…</p>
      </RoundImagePreviewFrame>
    );
  }

  return (
    <RoundImagePreviewFrame
      heading="Square Crop Editor"
      fileName={file.name}
      panelStyle={{ backgroundColor: '#f1f5f9' }}
    >
      <p className="text-sm text-slate-600 mb-4 w-full text-center leading-relaxed shrink-0">
        Drag inside the blue square to move it. Drag the green handle to resize.
      </p>
      <div ref={stageRef} className="w-full min-w-0 flex justify-center">
        {layoutReady ? (
          <div
            ref={containerRef}
            className="relative select-none touch-none rounded-lg overflow-hidden shadow-md ring-1 ring-slate-200 shrink-0"
            style={{ width: layout.width, height: layout.height }}
          >
            <img
              src={previewUrl}
              alt="Crop editor"
              draggable={false}
              className="block w-full h-full pointer-events-none"
            />

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <mask id={maskId}>
                  <rect width="100%" height="100%" fill="white" />
                  <rect
                    x={displayCrop.x}
                    y={displayCrop.y}
                    width={displayCrop.size}
                    height={displayCrop.size}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="rgba(15, 23, 42, 0.55)"
                mask={`url(#${maskId})`}
              />
              <rect
                x={displayCrop.x}
                y={displayCrop.y}
                width={displayCrop.size}
                height={displayCrop.size}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
              />
              <rect
                x={displayCrop.x + 2}
                y={displayCrop.y + 2}
                width={displayCrop.size - 4}
                height={displayCrop.size - 4}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="4 3"
                opacity="0.6"
              />
            </svg>

            {/* Move handle — invisible overlay on the crop area */}
            <button
              type="button"
              aria-label="Move crop square"
              className="absolute cursor-move bg-transparent"
              style={{
                left: displayCrop.x,
                top: displayCrop.y,
                width: displayCrop.size,
                height: displayCrop.size,
              }}
              onPointerDown={(event) => startDrag(event, 'move')}
            />

            {/* Resize handle — bottom-right corner */}
            <button
              type="button"
              aria-label="Resize crop square"
              title="Drag to resize"
              className="absolute z-10 bg-emerald-400 border-2 border-white rounded-sm cursor-nwse-resize shadow-md"
              style={{
                left: displayCrop.x + displayCrop.size - handleSize / 2,
                top: displayCrop.y + displayCrop.size - handleSize / 2,
                width: handleSize,
                height: handleSize,
              }}
              onPointerDown={(event) => startDrag(event, 'resize')}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading editor…</p>
        )}
      </div>
    </RoundImagePreviewFrame>
  );
}

SquareCropEditor.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  naturalSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  crop: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    size: PropTypes.number.isRequired,
  }).isRequired,
  onCropChange: PropTypes.func.isRequired,
};
