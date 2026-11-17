import PropTypes from 'prop-types';
import { DEFAULT_COLOR } from '../../../../constants/pdf-constants/editPdf/editPdfConstants';
import { estimateBlockPixelBox } from '../../../../utils/editPdf/geometryUtils';

export default function ExistingTextOverlay({
  block,
  scale,
  isEditing,
  isSelected,
  displayText,
  hasBeenEdited,
  onSelect,
  onFinishEdit,
  onDelete,
}) {
  const { left, top, width, height, fontSize } = estimateBlockPixelBox(block, scale);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={(e) => {
        if (!isEditing && !isSelected) e.currentTarget.style.outline = '1px dashed #94a3b8';
      }}
      onMouseLeave={(e) => {
        if (!isEditing && !isSelected) e.currentTarget.style.outline = 'none';
      }}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        zIndex: 20,
        outline: isEditing || isSelected ? '2px solid #3b82f6' : 'none',
        outlineOffset: 2,
        borderRadius: 2,
        cursor: 'text',
        boxSizing: 'border-box',
        backgroundColor: isEditing || hasBeenEdited ? '#ffffff' : 'transparent',
      }}
    >
      {isSelected && !isEditing && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 18,
            height: 18,
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: 9,
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
      {isEditing ? (
        <textarea
          autoFocus
          defaultValue={displayText}
          onBlur={(e) => onFinishEdit(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '100%',
            fontSize,
            fontFamily: block.font_family ?? 'inherit',
            color: block.color_hex ?? DEFAULT_COLOR,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: 0,
            margin: 0,
            lineHeight: 1.2,
            cursor: 'text',
            display: 'block',
            boxSizing: 'border-box',
          }}
        />
      ) : hasBeenEdited ? (
        <span
          style={{
            fontSize,
            fontFamily: block.font_family ?? 'inherit',
            color: block.color_hex ?? DEFAULT_COLOR,
            display: 'block',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            lineHeight: 1.2,
            whiteSpace: 'pre-wrap',
          }}
        >
          {displayText}
        </span>
      ) : null}
    </div>
  );
}

ExistingTextOverlay.propTypes = {
  block: PropTypes.object.isRequired,
  scale: PropTypes.number.isRequired,
  isEditing: PropTypes.bool,
  isSelected: PropTypes.bool,
  displayText: PropTypes.string.isRequired,
  hasBeenEdited: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onFinishEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};
