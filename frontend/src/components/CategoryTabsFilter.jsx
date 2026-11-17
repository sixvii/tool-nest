import { useState, useRef, useEffect } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { categoriesData } from '../data/toolsData';
import PropTypes from 'prop-types';

const tabCategories = categoriesData.filter((c) => c.showInTab);
const moreCategories = categoriesData.filter((c) => !c.showInTab);
const tabs = ['All', ...tabCategories.map((c) => c.title)];

const allTools = categoriesData.flatMap((cat) =>
  cat.tools.map((tool) => ({
    name: tool,
    category: cat.title,
    categoryId: cat.id,
    color: cat.color,
    icon: cat.icon,
    catDesc: cat.desc,
  }))
);

CategoryTabsFilter.propTypes = {
  onToolClick: PropTypes.func.isRequired,
};

export default function CategoryTabsFilter({ onToolClick }) {
  const [activeTab, setActiveTab] = useState('All');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTools =
    activeTab === 'All' ? allTools : allTools.filter((tool) => tool.category === activeTab);

  const isMoreActive = moreCategories.some((c) => c.title === activeTab);

  return (
    <div className="space-y-4 sm:space-y-8 w-full">
      {/* Header Row */}
      <div className="flex flex-col items-center justify-center text-center gap-3 sm:gap-6 border-b border-slate-100 pb-4 sm:pb-6 w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">All tools</h2>

        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center w-full">
          {/* Main tab pills */}
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setMoreOpen(false);
              }}
              className={`px-3 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold rounded-full border transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}

          {/* More dropdown */}
          {moreCategories.length > 0 && (
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((prev) => !prev)}
                className={`flex items-center gap-1 px-3 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-sm font-semibold rounded-full border transition-all duration-200 ${
                  isMoreActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {isMoreActive ? activeTab : 'More'}
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {moreOpen && (
                <div className="absolute top-full mt-2 left-0 z-20 bg-white border border-slate-200 rounded-2xl shadow-lg py-1 min-w-[180px]">
                  {moreCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveTab(cat.title);
                        setMoreOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                        activeTab === cat.title
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full">
        {filteredTools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <button
              key={`${tool.categoryId}-${tool.name}`}
              type="button"
              onClick={() => onToolClick(`/${tool.categoryId}/${encodeURIComponent(tool.name)}`)}
              className="group bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100/80 shadow-sm hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] sm:min-h-[210px] relative overflow-hidden text-left w-full"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div>
                <div
                  className={`p-2 sm:p-3 rounded-2xl w-fit mb-2 sm:mb-4 border ${tool.color} transform group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-200">
                  {tool.name}
                </h3>

                <p className="text-slate-400 text-[11px] sm:text-xs mt-1 sm:mt-2 line-clamp-2 leading-relaxed">
                  {tool.catDesc}
                </p>
              </div>

              <div className="border-t border-slate-50/80 pt-2 sm:pt-4 mt-2 sm:mt-4 flex justify-between items-center text-xs text-slate-400 font-medium group-hover:text-blue-600 transition-colors gap-1">
                <span className="text-[9px] sm:text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors whitespace-nowrap">
                  {tool.category}
                </span>
                <div className="flex items-center gap-1 font-bold text-blue-600 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0">
                  <span className="hidden sm:inline text-[10px]">Open</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
