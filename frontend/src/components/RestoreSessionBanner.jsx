import PropTypes from 'prop-types';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui';

/**
 * Shown when a tool restores persisted state after reload.
 * "Continue" dismisses the banner; "Discard" should also clear storage + local state.
 */
export default function RestoreSessionBanner({
  onContinue,
  onDiscard,
  message = 'Your previous session was restored.',
  className = '',
}) {
  return (
    <div
      role="status"
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-900">{message}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="secondary" size="sm" onClick={onDiscard}>
          Discard
        </Button>
        <Button variant="primary" size="sm" onClick={onContinue}>
          Got it
        </Button>
      </div>
    </div>
  );
}

RestoreSessionBanner.propTypes = {
  onContinue: PropTypes.func.isRequired,
  onDiscard: PropTypes.func.isRequired,
  message: PropTypes.string,
  className: PropTypes.string,
};
