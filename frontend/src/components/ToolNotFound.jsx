import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

ToolNotFound.propTypes = { toolName: PropTypes.string };

export default function ToolNotFound({ toolName }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
        <span className="text-3xl">🔧</span>
      </div>
      <h2 className="text-2xl font-black text-slate-800">Tool Not Available</h2>
      <p className="text-slate-400 mt-2 text-sm max-w-xs">
        <span className="font-semibold text-slate-600">"{toolName}"</span> is not supported yet or
        may be coming soon.
      </p>
      <Link
        to="/"
        className="mt-8 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
