import PropTypes from 'prop-types';
import { Sparkles, Upload, SlidersHorizontal, Download } from 'lucide-react';
import Card from '../ui/Card';
import { TOOL_LAYOUT } from '../../constants/toolLayoutConstants';
import { TOOL_OPTIONS_DEFAULTS } from '../../constants/toolOptionsConstants';
import ToolActionButtons from '../toolLayout/ToolActionButtons';
import TabBar from './TabBar';

export default function OptionsPanel({
  children = null,
  isProcessing = false,
  canApply = true,
  hasResult = false,
  applyLabel = TOOL_OPTIONS_DEFAULTS.applyLabel,
  applyingLabel = TOOL_OPTIONS_DEFAULTS.applyingLabel,
  downloadLabel = TOOL_OPTIONS_DEFAULTS.downloadLabel,
  completeMessage = '',
  description = null,
  descriptionIcon = null,
  descriptionStartLabel = 'Upload your image',
  descriptionEndLabel = 'Download the result',
  onApply = null,
  onDownload = null,
  showDownload = TOOL_OPTIONS_DEFAULTS.showDownload,
  showApply = TOOL_OPTIONS_DEFAULTS.showApply,
  actionsPlacement = TOOL_OPTIONS_DEFAULTS.actionsPlacement,
  footer = null,
  className = '',
  tabs = null,
  activeTab = null,
  onTabChange = null,
}) {
  const actionButtons =
    showApply && onApply ? (
      <ToolActionButtons
        isProcessing={isProcessing}
        canApply={canApply}
        hasResult={hasResult}
        applyLabel={applyLabel}
        applyingLabel={applyingLabel}
        downloadLabel={downloadLabel}
        showDownload={showDownload}
        onApply={onApply}
        onDownload={onDownload ?? (() => {})}
      />
    ) : null;

  const descriptionBox = description && (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-blue-200/30 blur-2xl" />
      <div className="absolute -bottom-8 -left-6 w-20 h-20 rounded-full bg-indigo-200/30 blur-2xl" />

      <div className="relative flex items-center gap-2.5 mb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          {descriptionIcon ?? <Sparkles className="w-4 h-4 text-white" />}
        </div>
        <h4 className="text-sm font-bold text-slate-700">How it works</h4>
      </div>

      <ol className="relative divide-y divide-blue-100/80">
        {[
          { icon: Upload, text: descriptionStartLabel },
          { icon: SlidersHorizontal, text: description },
          { icon: Download, text: descriptionEndLabel },
        ].map(({ icon: StepIcon, text }, index) => (
          <li key={index} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white shadow-sm border border-blue-100 flex items-center justify-center">
              <StepIcon className="w-3.5 h-3.5 text-blue-600" />
            </span>
            <span className="text-sm text-slate-600 leading-relaxed pt-1">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <Card padding="lg" className={`${TOOL_LAYOUT.optionsPanel} gap-5 ${className}`.trim()}>
      {hasResult && completeMessage && (
        <div className="text-sm font-semibold text-emerald-600 break-words">{completeMessage}</div>
      )}

      {actionsPlacement === 'top' && (
        <>
          {descriptionBox}
          {actionButtons}
        </>
      )}

      <div className={isProcessing ? 'opacity-50 pointer-events-none' : ''}>
        {tabs && activeTab && onTabChange && (
          <TabBar tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
        )}

        {children}
      </div>

      {actionsPlacement === 'bottom' && (
        <>
          {descriptionBox}
          {actionButtons}
        </>
      )}

      {footer}
    </Card>
  );
}

OptionsPanel.propTypes = {
  children: PropTypes.node,
  isProcessing: PropTypes.bool,
  canApply: PropTypes.bool,
  hasResult: PropTypes.bool,
  applyLabel: PropTypes.string,
  applyingLabel: PropTypes.string,
  downloadLabel: PropTypes.string,
  completeMessage: PropTypes.node,
  description: PropTypes.node,
  descriptionIcon: PropTypes.node,
  descriptionStartLabel: PropTypes.string,
  descriptionEndLabel: PropTypes.string,
  onApply: PropTypes.func,
  onDownload: PropTypes.func,
  showDownload: PropTypes.bool,
  showApply: PropTypes.bool,
  actionsPlacement: PropTypes.oneOf(['top', 'bottom']),
  footer: PropTypes.node,
  className: PropTypes.string,
  tabs: PropTypes.arrayOf(PropTypes.string),
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
};
