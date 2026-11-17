import PropTypes from 'prop-types';
import {
  HANDLES,
  HANDLE_POS,
  HANDLE_CURSOR,
} from '../../../../constants/pdf-constants/editPdf/editorUiConstants';

export default function ResizeHandles({ onMouseDown }) {
  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h}
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, h);
          }}
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: 2,
            cursor: HANDLE_CURSOR[h],
            zIndex: 30,
            ...HANDLE_POS[h],
          }}
        />
      ))}
    </>
  );
}

ResizeHandles.propTypes = {
  onMouseDown: PropTypes.func.isRequired,
};
