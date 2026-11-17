import PropTypes from 'prop-types';
import { Card } from '../../../../components/ui';
import { TOOL_LAYOUT } from '../../../../constants/toolLayoutConstants';
import { useBlobPreviewUrl } from '../../../../hooks/useBlobPreviewUrl';
import PreviewPanelResultActions from '../../../../components/toolPreview/PreviewPanelResultActions';

export default function FontAwesomePreviewPanel({
  resultBlob,
  selectedIcon,
  size,
  color,
  onDownload = null,
  isProcessing = false,
  renderLoader = null,
}) {
  const resultUrl = useBlobPreviewUrl(resultBlob);

  const renderContent = () => {
    if (resultUrl) {
      return (
        <img
          src={resultUrl}
          alt="Generated icon"
          className="max-w-full max-h-[50vh] w-auto h-auto object-contain drop-shadow-sm"
        />
      );
    }

    if (selectedIcon) {
      return (
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <i
            className={`fa-solid fa-${selectedIcon.name}`}
            style={{ fontSize: Math.min(size, 120), color }}
            aria-hidden
          />
          <p className="text-xs">Click Generate PNG to export at {size}px</p>
        </div>
      );
    }

    return <p className="text-sm text-slate-400">Select an icon and click Generate</p>;
  };

  return (
    <Card padding="lg" className={`${TOOL_LAYOUT.previewPanel} gap-4`}>
      {isProcessing && renderLoader ? (
        <div className="flex items-center min-h-[40vh] max-h-fit w-full">
          <div className="w-full">{renderLoader()}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-8 min-h-[40vh] max-h-fit">
          {renderContent()}
        </div>
      )}

      {resultBlob && onDownload && (
        <PreviewPanelResultActions onDownload={onDownload} downloadLabel="Download PNG" />
      )}
    </Card>
  );
}

const faIconShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  unicode: PropTypes.string,
});

FontAwesomePreviewPanel.propTypes = {
  resultBlob: PropTypes.instanceOf(Blob),
  selectedIcon: faIconShape,
  size: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  onDownload: PropTypes.func,
  isProcessing: PropTypes.bool,
  renderLoader: PropTypes.func,
};
