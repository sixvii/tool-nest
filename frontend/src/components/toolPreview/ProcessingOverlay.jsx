import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

export default function ProcessingOverlay({ label }) {
  return (
    <div className="absolute inset-0 rounded-xl bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

ProcessingOverlay.propTypes = {
  label: PropTypes.string.isRequired,
};
