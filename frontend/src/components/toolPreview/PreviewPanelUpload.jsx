import PropTypes from 'prop-types';
import FileUpload from '../ui/FileUpload';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';

export default function PreviewPanelUpload({
  labels,
  accept,
  multiple,
  onFiles,
  uploadIcon = null,
  uploadTitle = null,
  uploadSubtitle = null,
}) {
  return (
    <div className={TOOL_LAYOUT.uploadArea}>
      <FileUpload
        label={labels.uploadLabel}
        accept={accept}
        multiple={multiple}
        onFiles={onFiles}
        icon={uploadIcon ?? undefined}
        title={uploadTitle}
        subtitle={uploadSubtitle}
      />
    </div>
  );
}

PreviewPanelUpload.propTypes = {
  labels: PropTypes.object.isRequired,
  accept: PropTypes.string.isRequired,
  multiple: PropTypes.bool.isRequired,
  onFiles: PropTypes.func.isRequired,
  uploadIcon: PropTypes.elementType,
  uploadTitle: PropTypes.node,
  uploadSubtitle: PropTypes.node,
};
