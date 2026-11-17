import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { categoriesData } from '../data/toolsData';
import PropTypes from 'prop-types';

function MockDocPreview() {
  return (
    <div className="bg-slate-50 rounded-2xl p-3 mt-4 flex-1">
      <div className="bg-white rounded-xl p-3 shadow-sm h-full">
        <div className="flex gap-1 mb-3">
          <div className="w-2 h-2 rounded-full bg-rose-300" />
          <div className="w-2 h-2 rounded-full bg-amber-300" />
          <div className="w-2 h-2 rounded-full bg-emerald-300" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 bg-slate-200 rounded w-3/4" />
            <div className="h-1.5 bg-slate-100 rounded w-full" />
            <div className="h-1.5 bg-slate-100 rounded w-5/6" />
            <div className="h-1.5 bg-slate-100 rounded w-2/3 mt-2" />
            <div className="h-1.5 bg-slate-100 rounded w-full" />
            <div className="h-1.5 bg-slate-100 rounded w-3/4" />
          </div>
          <div className="w-1/3 bg-slate-50 rounded-lg p-1.5 space-y-1.5">
            <div className="h-1.5 bg-slate-200 rounded w-full" />
            <div className="h-1.5 bg-blue-100 rounded w-4/5" />
            <div className="h-1.5 bg-slate-100 rounded w-3/5" />
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          <div className="h-5 bg-blue-500 rounded-lg w-16" />
          <div className="h-5 bg-slate-100 rounded-lg w-12" />
        </div>
      </div>
    </div>
  );
}

export default function FeaturedToolCard({ tool, variant = 'medium' }) {
  const navigate = useNavigate();
  const cat = categoriesData.find((c) => c.id === tool.categoryId);
  if (!cat) return null;
  const IconComponent = cat.icon;
  const toolDesc = tool.desc || cat.desc;

  const handleClick = () => navigate(`/${tool.categoryId}/${encodeURIComponent(tool.name)}`);

  // ── Large card ────────────────────────────────────────────────────
  if (variant === 'large') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col h-full min-h-[320px] group text-left w-full"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-slate-900 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
            Trending
          </span>
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cat.color}`}
          >
            {cat.title.split(' ')[0]}
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
          {tool.name}
        </h3>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">{toolDesc}</p>

        <span className="mt-4 flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full w-fit group-hover:bg-blue-600 transition-colors">
          Use tool <ArrowRight className="w-3.5 h-3.5" />
        </span>

        <MockDocPreview />
      </button>
    );
  }

  // ── Medium card ───────────────────────────────────────────────────
  if (variant === 'medium') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all duration-200 flex items-start gap-3 group w-full text-left"
      >
        <div
          className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${cat.color} group-hover:scale-110 transition-transform duration-200`}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">
            {cat.title.split(' ')[0]}
          </p>
          <h4 className="font-bold text-slate-800 text-sm mt-0.5 group-hover:text-blue-600 transition-colors line-clamp-1">
            {tool.name}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
            {toolDesc}
          </p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-0.5" />
      </button>
    );
  }

  // ── Small card ────────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 cursor-pointer hover:shadow-md hover:border-blue-100 transition-all duration-200 flex items-center gap-3 group w-full text-left"
    >
      <div
        className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.color} group-hover:scale-110 transition-transform duration-200`}
      >
        <IconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition-colors truncate">
          {tool.name}
        </h4>
        <p className="text-[10px] text-slate-400 truncate mt-0.5">{toolDesc}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
    </button>
  );
}

FeaturedToolCard.propTypes = {
  tool: PropTypes.shape({
    name: PropTypes.string.isRequired,
    categoryId: PropTypes.string.isRequired,
    desc: PropTypes.string,
  }).isRequired,
  variant: PropTypes.oneOf(['large', 'medium', 'small']),
};
