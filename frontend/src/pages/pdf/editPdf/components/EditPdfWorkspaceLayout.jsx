import PropTypes from 'prop-types';
import { EDIT_PDF_LAYOUT } from '../../../../constants/pdf-constants/editPdf/editPdfLayoutConstants';

export default function EditPdfWorkspaceLayout({ preview, sidebar }) {
  return (
    <div
      className={`flex flex-col xl:flex-row ${EDIT_PDF_LAYOUT.rowGap} w-full ${EDIT_PDF_LAYOUT.shellPadding}`}
      style={{ minHeight: '100vh' }}
    >
      <div className={`flex-1 min-w-0 ${EDIT_PDF_LAYOUT.previewPane}`}>{preview}</div>
      <div
        className={`${EDIT_PDF_LAYOUT.sidebarWidth} flex-shrink-0 ${EDIT_PDF_LAYOUT.sidebarPane}`}
      >
        {sidebar}
      </div>
    </div>
  );
}

EditPdfWorkspaceLayout.propTypes = {
  preview: PropTypes.node.isRequired,
  sidebar: PropTypes.node.isRequired,
};
