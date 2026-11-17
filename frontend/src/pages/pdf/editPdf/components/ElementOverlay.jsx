import PropTypes from 'prop-types';
import ShapeElement from './ShapeElement';
import ResizeHandles from './ResizeHandles';

export default function ElementOverlay({
  el,
  scale,
  isSelected,
  onMouseDown,
  onResizeMouseDown,
  onUpdate,
}) {
  const left = el.x * scale;
  const top = el.y * scale;

  if (el.type === 'text') {
    const fs = `${el.italic ? 'italic' : 'normal'} ${el.bold ? 'bold' : 'normal'} ${el.fontSize * scale}px ${el.fontFamily}`;
    return (
      <div
        onMouseDown={(e) => onMouseDown(e, el)}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left,
          top,
          zIndex: 25,
          font: fs,
          color: el.color,
          textAlign: el.align,
          textDecoration: el.underline ? 'underline' : 'none',
          cursor: 'move',
          outline: isSelected ? '2px dashed #3b82f6' : '1px dashed #cbd5e1',
          outlineOffset: 2,
          padding: '0 2px',
          borderRadius: 2,
          userSelect: 'none',
          minWidth: 40,
          lineHeight: 1.2,
        }}
      >
        {isSelected ? (
          <textarea
            autoFocus
            value={el.text}
            onChange={(e) => onUpdate(el.id, { text: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            rows={Math.max(1, el.text.split('\n').length)}
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: 'none',
              outline: 'none',
              resize: 'none',
              font: fs,
              color: el.color,
              textAlign: el.align,
              textDecoration: el.underline ? 'underline' : 'none',
              padding: 0,
              margin: 0,
              cursor: 'text',
              width: '100%',
              minWidth: 100,
              display: 'block',
            }}
          />
        ) : (
          <span style={{ whiteSpace: 'pre-wrap', display: 'block' }}>{el.text}</span>
        )}
      </div>
    );
  }

  if (el.type === 'shape') {
    return (
      <div
        onMouseDown={(e) => onMouseDown(e, el)}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left,
          top,
          zIndex: 25,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <ShapeElement el={el} scale={scale} isSelected={isSelected} />
        {isSelected && <ResizeHandles onMouseDown={(e, h) => onResizeMouseDown(e, el, h)} />}
      </div>
    );
  }

  if (el.type === 'image' || el.type === 'drawing') {
    return (
      <div
        onMouseDown={(e) => onMouseDown(e, el)}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left,
          top,
          zIndex: 25,
          width: el.w * scale,
          height: el.h * scale,
          cursor: 'move',
          outline: isSelected ? '2px dashed #3b82f6' : 'none',
          outlineOffset: 2,
          userSelect: 'none',
        }}
      >
        <img
          src={el.src}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            display: 'block',
          }}
        />
        {isSelected && <ResizeHandles onMouseDown={(e, h) => onResizeMouseDown(e, el, h)} />}
      </div>
    );
  }

  return null;
}

ElementOverlay.propTypes = {
  el: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  isSelected: PropTypes.bool,
  onMouseDown: PropTypes.func.isRequired,
  onResizeMouseDown: PropTypes.func.isRequired,
  onUpdate: PropTypes.func.isRequired,
};
