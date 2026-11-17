import { useId, useLayoutEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useBlobPreviewUrl } from '../../../../hooks/useBlobPreviewUrl';
import {
  CROP_DRAG_MODES,
  CROP_IMAGE_COPY,
  CROP_IMAGE_LAYOUT,
  CROP_OVERLAY_STYLE,
} from '../../../../constants/image/cropImage/cropImageConstants';
import CropAspectRatioPicker from './CropAspectRatioPicker';
import {
  CROP_HANDLE_SIZE,
  getAspectRatioFromPreset,
  getImageDisplayLayout,
  getNaturalPointerFromEvent,
  getPointerRectCropUpdate,
  getResizeHandlePosition,
  isAspectRatioLocked,
  rectCropToDisplay,
  resolveCropConstraints,
} from '../../../../utils/image/cropImage/cropImageUtils';
import RoundImagePreviewFrame from '../../roundImage/components/RoundImagePreviewFrame';

export default function CropRectEditor({
  file,
  naturalSize,
  crop,
  aspectPresetId,
  customRatio,
  onAspectPresetChange,
  onCustomRatioChange,
  onCropChange,
}) {
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
    stageWidth || CROP_IMAGE_LAYOUT.editorMaxWidth,
    CROP_IMAGE_LAYOUT.editorMaxHeight
  );

  const aspectRatio = getAspectRatioFromPreset(
    aspectPresetId,
    naturalSize.width,
    naturalSize.height,
    customRatio
  );
  const aspectLocked = isAspectRatioLocked(aspectPresetId);
  const displayCrop = rectCropToDisplay(crop, layout.scale);
  const handlePosition = getResizeHandlePosition(displayCrop, CROP_HANDLE_SIZE);
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
    const nextCrop = getPointerRectCropUpdate(
      drag.mode,
      drag.startCrop,
      { x: event.clientX - drag.startX, y: event.clientY - drag.startY },
      layout.scale,
      pointer,
      aspectRatio
    );
    onCropChange(
      resolveCropConstraints(nextCrop, naturalSize.width, naturalSize.height, aspectRatio)
    );
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
        heading={CROP_IMAGE_COPY.editorHeading}
        fileName={file?.name}
        panelStyle={{ backgroundColor: '#f8fafc' }}
      >
        <p className="text-sm text-slate-500">Loading editor…</p>
      </RoundImagePreviewFrame>
    );
  }

  return (
    <RoundImagePreviewFrame
      heading={CROP_IMAGE_COPY.editorHeading}
      fileName={file.name}
      panelStyle={{ backgroundColor: '#f1f5f9' }}
    >
      <CropAspectRatioPicker
        selectedPresetId={aspectPresetId}
        customRatio={customRatio}
        imageWidth={naturalSize.width}
        imageHeight={naturalSize.height}
        onSelect={onAspectPresetChange}
        onCustomRatioChange={onCustomRatioChange}
      />
      <p className="text-sm text-slate-600 mb-4 w-full text-center leading-relaxed shrink-0">
        {aspectLocked ? CROP_IMAGE_COPY.editorHintLocked : CROP_IMAGE_COPY.editorHint}
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
                    width={displayCrop.width}
                    height={displayCrop.height}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill={CROP_OVERLAY_STYLE.dim}
                mask={`url(#${maskId})`}
              />
              <rect
                x={displayCrop.x}
                y={displayCrop.y}
                width={displayCrop.width}
                height={displayCrop.height}
                fill="none"
                stroke={CROP_OVERLAY_STYLE.border}
                strokeWidth="2"
              />
            </svg>

            <button
              type="button"
              aria-label="Move crop area"
              className="absolute cursor-move bg-transparent"
              style={{
                left: displayCrop.x,
                top: displayCrop.y,
                width: displayCrop.width,
                height: displayCrop.height,
              }}
              onPointerDown={(event) => startDrag(event, CROP_DRAG_MODES.MOVE)}
            />

            <button
              type="button"
              aria-label="Resize crop area"
              title="Drag to resize"
              className="absolute z-10 border-2 border-white rounded-sm cursor-nwse-resize shadow-md"
              style={{
                left: handlePosition.left,
                top: handlePosition.top,
                width: CROP_HANDLE_SIZE,
                height: CROP_HANDLE_SIZE,
                backgroundColor: CROP_OVERLAY_STYLE.handle,
              }}
              onPointerDown={(event) => startDrag(event, CROP_DRAG_MODES.RESIZE)}
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading editor…</p>
        )}
      </div>
    </RoundImagePreviewFrame>
  );
}

CropRectEditor.propTypes = {
  file: PropTypes.instanceOf(File).isRequired,
  naturalSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  crop: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  onCropChange: PropTypes.func.isRequired,
  aspectPresetId: PropTypes.string.isRequired,
  customRatio: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onAspectPresetChange: PropTypes.func.isRequired,
  onCustomRatioChange: PropTypes.func.isRequired,
};
