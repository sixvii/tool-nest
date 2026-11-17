import PropTypes from 'prop-types';
import Card from '../../../../components/ui/Card';
import Heading from '../../../../components/ui/Heading';
import { ROUND_IMAGE_LAYOUT } from '../../../../constants/image/roundImage/roundImageConstants';

export default function RoundImagePreviewFrame({ heading, fileName, children, panelStyle }) {
  return (
    <Card
      className="flex flex-col w-full"
      style={{ minHeight: ROUND_IMAGE_LAYOUT.previewMinHeight }}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <Heading as="h4">{heading}</Heading>
        {fileName && (
          <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 truncate max-w-[160px]">
            {fileName}
          </span>
        )}
      </div>
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-slate-200 p-4 w-full min-w-0 overflow-hidden"
        style={{
          minHeight: ROUND_IMAGE_LAYOUT.previewPanelMinHeight,
          ...panelStyle,
        }}
      >
        {children}
      </div>
    </Card>
  );
}

RoundImagePreviewFrame.propTypes = {
  heading: PropTypes.string.isRequired,
  fileName: PropTypes.string,
  children: PropTypes.node.isRequired,
  panelStyle: PropTypes.object,
};

RoundImagePreviewFrame.defaultProps = {
  fileName: null,
  panelStyle: undefined,
};
