import { useId, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useBlobPreviewUrl } from '../../../../hooks/useBlobPreviewUrl';
import {
  ROUND_IMAGE_COPY,
  ROUND_IMAGE_LAYOUT,
} from '../../../../constants/image/roundImage/roundImageConstants';
import {
  circleCropToDisplay,
  clampCircleCrop,
  CIRCLE_CROP_HANDLE_SIZE,
  getImageDisplayLayout,
  getNaturalPointerFromEvent,
  getPointerCropUpdate,
} from '../../../../utils/image/circleCropUtils';
import RoundImagePreviewFrame from './RoundImagePreviewFrame';

export default function CircleCropEditor({ file, naturalSize, crop, onCropChange }) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const maskId = useId();
  const previewUrl = useBlobPreviewUrl(file);
  const [stageWidth, setStageWidth] = useState(0);

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
    stageWidth || ROUND_IMAGE_LAYOUT.editorMaxWidth,
    ROUND_IMAGE_LAYOUT.editorMaxHeight
  );

  const displayCrop = circleCropToDisplay(crop, layout.scale);
  const handleSize = CIRCLE_CROP_HANDLE_SIZE;
  const handleLeft = displayCrop.centerX + displayCrop.radius - handleSize / 2;
  const handleTop = displayCrop.centerY - handleSize / 2;
  const boundsLeft = displayCrop.centerX - displayCrop.radius;
  const boundsTop = displayCrop.centerY - displayCrop.radius;
  const boundsSize = displayCrop.radius * 2;
  const layoutReady = stageWidth > 0 && layout.width > 0;

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDrag);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || !container) return;

    const rect = container.getBoundingClientRect();
    const pointer = getNaturalPointerFromEvent(event, rect, layout.scale);
    const nextCrop = getPointerCropUpdate(
      drag.mode,
      drag.startCrop,
      { x: event.clientX - drag.startX, y: event.clientY - drag.startY },
      layout.scale,
      pointer
    );
    onCropChange(clampCircleCrop(nextCrop, naturalSize.width, naturalSize.height));
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
        heading={ROUND_IMAGE_COPY.editorHeading}
        fileName={file?.name}
        panelStyle={{ backgroundColor: '#f8fafc' }}
      >
        <p className="text-sm text-slate-500">Loading editor…</p>
      </RoundImagePreviewFrame>
    );
  }

  return (
    <RoundImagePreviewFrame
      heading={ROUND_IMAGE_COPY.editorHeading}
      fileName={file.name}
      panelStyle={{ backgroundColor: '#f1f5f9' }}
    >
      <p className="text-sm text-slate-600 mb-4 w-full text-center leading-relaxed shrink-0">
        {ROUND_IMAGE_COPY.editorHint}
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
                  <circle
                    cx={displayCrop.centerX}
                    cy={displayCrop.centerY}
                    r={displayCrop.radius}
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
                x={boundsLeft}
                y={boundsTop}
                width={boundsSize}
                height={boundsSize}
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <circle
                cx={displayCrop.centerX}
                cy={displayCrop.centerY}
                r={displayCrop.radius}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
              />
              <circle
                cx={displayCrop.centerX}
                cy={displayCrop.centerY}
                r="4"
                fill="#ffffff"
                stroke="#ef4444"
                strokeWidth="1.5"
              />
            </svg>

            <button
              type="button"
              aria-label="Move crop circle"
              className="absolute rounded-full cursor-move bg-transparent"
              style={{
                left: boundsLeft,
                top: boundsTop,
                width: boundsSize,
                height: boundsSize,
              }}
              onPointerDown={(event) => startDrag(event, 'move')}
            />

            <button
              type="button"
              aria-label="Resize crop circle"
              title="Drag to resize"
              className="absolute z-10 bg-emerald-400 border-2 border-white rounded-sm cursor-ew-resize shadow-md"
              style={{
                left: handleLeft,
                top: handleTop,
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

CircleCropEditor.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  naturalSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  crop: PropTypes.shape({
    centerX: PropTypes.number.isRequired,
    centerY: PropTypes.number.isRequired,
    radius: PropTypes.number.isRequired,
  }).isRequired,
  onCropChange: PropTypes.func.isRequired,
};
