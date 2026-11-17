import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import Button from '../ui/Button';

export default function ToolActionButtons({
  isProcessing,
  canApply,
  hasResult,
  applyLabel,
  applyingLabel,
  downloadLabel,
  onApply,
  onDownload,
  showDownload = true,
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={isProcessing}
        disabled={isProcessing || !canApply}
        onClick={onApply}
      >
        {isProcessing ? applyingLabel : applyLabel}
      </Button>

      {showDownload && hasResult && (
        <Button variant="success" size="lg" fullWidth onClick={onDownload}>
          <Download className="w-4 h-4" />
          {downloadLabel}
        </Button>
      )}
    </div>
  );
}

ToolActionButtons.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
  canApply: PropTypes.bool.isRequired,
  hasResult: PropTypes.bool.isRequired,
  applyLabel: PropTypes.string.isRequired,
  applyingLabel: PropTypes.string.isRequired,
  downloadLabel: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
  showDownload: PropTypes.bool,
};
