import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import CompareToggle from './CompareToggle';

export default function PreviewPanelResultActions({
  showCompare = false,
  showOriginal = false,
  onSelectView,
  compareLabels,
  onDownload,
  downloadLabel,
  isProcessing = false,
  children = null,
}) {
  if (!showCompare && !onDownload && !children) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-100 shrink-0">
      {showCompare && onSelectView && compareLabels && (
        <CompareToggle
          showOriginal={showOriginal}
          onSelectView={onSelectView}
          labels={compareLabels}
          disabled={isProcessing}
        />
      )}

      {onDownload && (
        <Button
          variant="primary"
          size="md"
          disabled={isProcessing}
          onClick={onDownload}
          className="min-w-[8.5rem]"
        >
          <Download className="w-4 h-4" />
          {downloadLabel}
        </Button>
      )}

      {children}
    </div>
  );
}

PreviewPanelResultActions.propTypes = {
  showCompare: PropTypes.bool,
  showOriginal: PropTypes.bool,
  onSelectView: PropTypes.func,
  compareLabels: PropTypes.object,
  onDownload: PropTypes.func,
  downloadLabel: PropTypes.string,
  isProcessing: PropTypes.bool,
  children: PropTypes.node,
};

PreviewPanelResultActions.defaultProps = {
  showCompare: false,
  showOriginal: false,
  onSelectView: null,
  compareLabels: null,
  onDownload: null,
  downloadLabel: 'Download',
  isProcessing: false,
  children: null,
};
