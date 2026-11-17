import { Link } from 'react-router-dom';
import { ChevronRight, Home as HomeIcon } from 'lucide-react';

export default function Breadcrumb({ category, toolName }) {
  return (
    <div className="w-full bg-white border-b border-slate-100 py-2 sm:py-4 px-3 sm:px-6 shadow-sm mb-4 sm:mb-6">
      <div className="max-w-6xl mx-auto">
        <nav className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-sm text-slate-500 transition-all overflow-x-auto pb-1">
          <Link
            to="/"
            className="hover:text-blue-600 flex items-center gap-1 font-semibold transition-colors text-slate-600 flex-shrink-0"
          >
            <HomeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />{' '}
            <span className="hidden sm:inline">Home</span>
            <span className="sm:hidden">H</span>
          </Link>

          {category && (
            <>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 flex-shrink-0" />
              <Link
                to={`/category/${category.id}`}
                className="text-slate-500 hover:text-blue-600 font-semibold capitalize transition-colors truncate"
              >
                {category.title}
              </Link>
            </>
          )}

          {toolName && (
            <>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 flex-shrink-0" />
              <span
                className="text-slate-900 font-bold bg-blue-50/60 border border-blue-100/50 px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-lg truncate max-w-[120px] sm:max-w-none text-[10px] sm:text-sm"
                title={toolName}
              >
                {toolName}
              </span>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
