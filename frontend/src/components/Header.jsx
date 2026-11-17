import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { categoriesData } from '../data/toolsData';
import { searchTools } from '../utils/searchTools';
import { Menu, X, Search, Clock } from 'lucide-react';
import { Button } from './ui';
import {
  loadRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../utils/recentSearches';

const SINGLE_CAT_IDS = new Set(['pdf', 'image', 'video']);
const MORE_CAT_IDS = new Set(['audio', 'ai-write', 'file']);

function getPillLabel(cat) {
  if (!cat) return '';
  if (cat.id === 'ai-write') return 'Text';
  if (cat.id === 'file') return 'File';
  return cat.title.split(' ')[0];
}

function highlightMatch(text, query) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-blue-100 text-blue-700 rounded-sm">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function Header() {
  const navigate = useNavigate();

  // Dropdown alignment detection
  const [dropdownAlignment, setDropdownAlignment] = useState({});
  const wrapperRefs = useRef({});

  // Mobile state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Logo name visibility — hides after scrolling 80px
  const [nameVisible, setNameVisible] = useState(true);
  useEffect(() => {
    const onScroll = () => setNameVisible(window.scrollY < 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Desktop pill search
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [desktopQuery, setDesktopQuery] = useState('');
  const [desktopResultsOpen, setDesktopResultsOpen] = useState(false);
  const [desktopActiveIndex, setDesktopActiveIndex] = useState(-1);
  const pillSearchRef = useRef(null);

  // Mobile search
  const [mobileQuery, setMobileQuery] = useState('');
  const [mobileResultsOpen, setMobileResultsOpen] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(-1);
  const mobileSearchRef = useRef(null);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);

  const desktopResults = useMemo(() => searchTools(desktopQuery), [desktopQuery]);
  const mobileResults = useMemo(() => searchTools(mobileQuery), [mobileQuery]);

  // Collapse pill search on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (pillSearchRef.current && !pillSearchRef.current.contains(e.target)) {
        setSearchExpanded(false);
        setDesktopResultsOpen(false);
        setDesktopQuery('');
        setDesktopActiveIndex(-1);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target))
        setMobileResultsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToRecent = (categoryId, toolName) => {
    const categoryTitle = categoriesData.find((c) => c.id === categoryId)?.title || '';
    setRecentSearches(addRecentSearch(categoryId, toolName, categoryTitle));
  };

  const removeRecent = (categoryId, toolName) => {
    setRecentSearches(removeRecentSearch(categoryId, toolName));
  };

  const clearAllRecent = () => setRecentSearches(clearRecentSearches());

  const handleSearchResultClick = (categoryId, toolName) => {
    addToRecent(categoryId, toolName);
    navigate(`/${categoryId}/${encodeURIComponent(toolName)}`);
    setDesktopQuery('');
    setDesktopResultsOpen(false);
    setDesktopActiveIndex(-1);
    setSearchExpanded(false);
    setMobileQuery('');
    setMobileResultsOpen(false);
    setMobileActiveIndex(-1);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const handleSearchKeyDown = (e, results, activeIndex, setActiveIndex, setResultsOpen) => {
    if (e.key === 'Escape') {
      setResultsOpen(false);
      setActiveIndex(-1);
      setSearchExpanded(false);
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((p) => (p + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((p) => (p <= 0 ? results.length - 1 : p - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = activeIndex >= 0 ? results[activeIndex] : null;
      if (chosen) handleSearchResultClick(chosen.categoryId, chosen.name);
    }
  };

  const handleToolClick = (categoryId, toolName) => {
    navigate(`/${categoryId}/${encodeURIComponent(toolName)}`);
    setMobileMenuOpen(false);
    setExpandedCategory(null);
  };

  const handleMouseEnter = (id) => {
    const wrapper = wrapperRefs.current[id];
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const menuWidth = Math.min(560, window.innerWidth - 64);
    setDropdownAlignment((prev) => ({
      ...prev,
      [id]: window.innerWidth - rect.left < menuWidth + 24 ? 'right' : 'left',
    }));
  };

  const alignClass = (id) =>
    (dropdownAlignment[id] || 'left') === 'right' ? 'right-0 left-auto' : 'left-0 right-auto';
  const arrowClass = (id) =>
    (dropdownAlignment[id] || 'left') === 'right' ? 'right-10' : 'left-10';

  // Shared search result content — no positioning, caller wraps it
  const renderSearchContent = ({ query, results, activeIndex, setActiveIndex }) => {
    const showRecent = !query.trim() && recentSearches.length > 0;
    if (!showRecent && !query.trim()) return null;
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[60vh] overflow-y-auto">
        {showRecent ? (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recent
              </span>
              <button
                onClick={clearAllRecent}
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
            {recentSearches.map((r) => (
              <div
                key={`${r.categoryId}-${r.name}`}
                className="flex items-center justify-between px-4 py-2 hover:bg-blue-50 group"
              >
                <button
                  onClick={() => handleSearchResultClick(r.categoryId, r.name)}
                  className="flex items-center justify-between flex-1 text-left gap-3"
                >
                  <span className="text-sm font-medium text-slate-700">{r.name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    {r.category}
                  </span>
                </button>
                <button
                  onClick={() => removeRecent(r.categoryId, r.name)}
                  className="ml-2 text-slate-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {results.length > 0 ? (
              results.map((tool, idx) => (
                <button
                  key={`${tool.categoryId}-${tool.name}`}
                  onClick={() => handleSearchResultClick(tool.categoryId, tool.name)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-b-0 ${idx === activeIndex ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                >
                  <span className="text-sm font-medium text-slate-800">
                    {highlightMatch(tool.name, query)}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 whitespace-nowrap">
                    {tool.category}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-slate-400">No tools found.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const singleCats = categoriesData.filter((c) => SINGLE_CAT_IDS.has(c.id));
  const moreCats = categoriesData.filter((c) => MORE_CAT_IDS.has(c.id));

  return (
    <>
      {/* ── Full-width navbar ────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm"
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          {/* ── LEFT: Logo + nav links ─────────────────────────────── */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                TN
              </div>
              <AnimatePresence>
                {nameVisible && (
                  <motion.span
                    key="name"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25 }}
                    className="text-sm font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent overflow-hidden whitespace-nowrap hidden sm:block"
                  >
                    TOOL NEST
                  </motion.span>
                )}
              </AnimatePresence>
            </a>

            {/* Desktop nav anchor links */}
            <div className="hidden lg:flex items-center gap-0.5 ml-2 pl-3 border-l border-slate-200">
              {[
                ['/#featured', 'Featured'],
                ['/tools', 'Tools'],
                ['/#categories', 'Categories'],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-full hover:bg-slate-50 whitespace-nowrap"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* ── SPACER ─────────────────────────────────────────────── */}
          <div className="flex-1" />

          {/* ── RIGHT: Search + category dropdowns (desktop) ────────── */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {/* Search — icon button, expands as absolute overlay */}
            <div className="relative" ref={pillSearchRef}>
              <button
                onClick={() => setSearchExpanded(true)}
                className={`p-1.5 rounded-full transition-colors text-slate-500 hover:bg-slate-100 ${searchExpanded ? 'invisible pointer-events-none' : ''}`}
              >
                <Search className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {searchExpanded && (
                  <motion.div
                    key="search-input"
                    initial={{ width: 32, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 32, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center bg-white border-2 border-blue-400 rounded-full px-3 py-1.5 overflow-hidden shadow-md z-20"
                  >
                    <Search className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search tools..."
                      value={desktopQuery}
                      onChange={(e) => {
                        setDesktopQuery(e.target.value);
                        setDesktopResultsOpen(true);
                        setDesktopActiveIndex(-1);
                      }}
                      onFocus={() => setDesktopResultsOpen(true)}
                      onKeyDown={(e) =>
                        handleSearchKeyDown(
                          e,
                          desktopResults,
                          desktopActiveIndex,
                          setDesktopActiveIndex,
                          setDesktopResultsOpen
                        )
                      }
                      className="flex-1 bg-transparent outline-none text-xs ml-2 text-slate-700 placeholder:text-slate-400 min-w-0"
                    />
                    {desktopQuery && (
                      <button
                        onClick={() => {
                          setDesktopQuery('');
                          setDesktopResultsOpen(false);
                          setDesktopActiveIndex(-1);
                        }}
                        className="text-slate-400 hover:text-slate-600 flex-shrink-0 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Results dropdown — anchored to search container */}
              {searchExpanded && desktopResultsOpen && (
                <div className="absolute top-[calc(100%+10px)] right-0 w-72 z-30">
                  {renderSearchContent({
                    query: desktopQuery,
                    results: desktopResults,
                    activeIndex: desktopActiveIndex,
                    setActiveIndex: setDesktopActiveIndex,
                  })}
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-slate-200 flex-shrink-0 mx-1" />

            {/* PDF, Image, Video dropdowns */}
            {singleCats.map((category) => (
              <div
                key={category.id}
                className="relative group flex-shrink-0"
                ref={(el) => (wrapperRefs.current[category.id] = el)}
              >
                <button
                  aria-haspopup="true"
                  onMouseEnter={() => handleMouseEnter(category.id)}
                  onFocus={() => handleMouseEnter(category.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors whitespace-nowrap"
                >
                  {getPillLabel(category)} <span className="text-[10px]">▾</span>
                </button>

                <div
                  className={`absolute top-full mt-3 ${alignClass(category.id)} w-[min(540px,calc(100vw-4rem))] max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-[28px] shadow-2xl shadow-slate-900/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-200 z-50`}
                >
                  <div
                    className={`absolute ${arrowClass(category.id)} -top-2 h-3 w-3 bg-white border-t border-l border-slate-200 rotate-45`}
                  />
                  <div className="grid grid-cols-[210px_1fr] gap-4 p-5">
                    <div className="rounded-3xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500">
                        Featured
                      </p>
                      <div className="mt-3 space-y-2">
                        {category.tools.slice(0, 4).map((tool, idx) => (
                          <button
                            key={tool}
                            onClick={() => handleToolClick(category.id, tool)}
                            className="flex items-start gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm hover:bg-blue-50 hover:shadow-md transition-all duration-150 w-full text-left"
                          >
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-xs font-bold flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900 text-xs">{tool}</p>
                              <p className="text-[10px] text-slate-400">Quick access</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500">
                          All tools
                        </p>
                        <span className="text-xs text-blue-600">
                          {category.tools.length - 4} more
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {category.tools.slice(4).map((tool) => (
                          <button
                            key={tool}
                            onClick={() => handleToolClick(category.id, tool)}
                            className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:border-blue-200 hover:bg-white hover:text-blue-700 transition-all text-left"
                          >
                            {tool}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* More▾ — Audio + AI Write + File combined */}
            <div
              className="relative group flex-shrink-0"
              ref={(el) => (wrapperRefs.current['more'] = el)}
            >
              <button
                aria-haspopup="true"
                onMouseEnter={() => handleMouseEnter('more')}
                onFocus={() => handleMouseEnter('more')}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors whitespace-nowrap"
              >
                More <span className="text-[10px]">▾</span>
              </button>

              <div
                className={`absolute top-full mt-3 ${alignClass('more')} w-[min(560px,calc(100vw-4rem))] max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-[28px] shadow-2xl shadow-slate-900/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-200 z-50`}
              >
                <div
                  className={`absolute ${arrowClass('more')} -top-2 h-3 w-3 bg-white border-t border-l border-slate-200 rotate-45`}
                />
                <div className="p-5 space-y-5">
                  {moreCats.map((cat) => (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`p-1 rounded-lg border ${cat.color}`}>
                          <cat.icon className="w-3 h-3" />
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-500">
                          {cat.title}
                        </p>
                        <button
                          onClick={() => navigate(`/category/${cat.id}`)}
                          className="ml-auto text-[10px] text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          See all →
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {cat.tools.slice(0, 6).map((tool) => (
                          <button
                            key={tool}
                            onClick={() => handleToolClick(cat.id, tool)}
                            className="block rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 hover:border-blue-200 hover:bg-white hover:text-blue-700 transition-all text-left"
                          >
                            {tool}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile icons (lg:hidden) ────────────────────────────── */}
          <div className="flex items-center gap-1 ml-2 lg:hidden">
            <button
              aria-label="Search"
              onClick={() => {
                setMobileSearchOpen((p) => !p);
                setMobileMenuOpen(false);
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </button>
            <button
              aria-label="Menu"
              onClick={() => {
                setMobileMenuOpen((p) => !p);
                setMobileSearchOpen(false);
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-slate-600" />
              ) : (
                <Menu className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile search panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-xl p-3 lg:hidden"
          >
            <div ref={mobileSearchRef}>
              <div className="flex items-center border-2 border-slate-200 rounded-xl px-3 py-2 bg-white focus-within:border-blue-400 transition-colors">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search tools..."
                  value={mobileQuery}
                  onChange={(e) => {
                    setMobileQuery(e.target.value);
                    setMobileResultsOpen(true);
                    setMobileActiveIndex(-1);
                  }}
                  onFocus={() => setMobileResultsOpen(true)}
                  onKeyDown={(e) =>
                    handleSearchKeyDown(
                      e,
                      mobileResults,
                      mobileActiveIndex,
                      setMobileActiveIndex,
                      setMobileResultsOpen
                    )
                  }
                  className="w-full px-3 py-1 bg-white focus:outline-none text-sm"
                />
                {mobileQuery && (
                  <button
                    onClick={() => {
                      setMobileQuery('');
                      setMobileResultsOpen(false);
                      setMobileActiveIndex(-1);
                    }}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {mobileResultsOpen && (
                <div className="mt-2">
                  {renderSearchContent({
                    query: mobileQuery,
                    results: mobileResults,
                    activeIndex: mobileActiveIndex,
                    setActiveIndex: setMobileActiveIndex,
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile menu panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-xl max-h-[calc(100vh-64px)] overflow-y-auto lg:hidden"
          >
            <nav className="flex flex-col gap-1 p-3">
              {/* Anchor links row */}
              <div className="flex gap-1 pb-2 mb-1 border-b border-slate-100">
                {[
                  ['/#featured', 'Featured'],
                  ['/tools', 'Tools'],
                  ['/#categories', 'Categories'],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full py-2 transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>

              {/* Single category accordions */}
              {singleCats.map((category) => (
                <div key={category.id}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedCategory(expandedCategory === category.id ? null : category.id)
                    }
                    className="w-full justify-between px-4 py-3 text-slate-700"
                  >
                    <span className="font-semibold">{category.title}</span>
                    <span
                      className={`transform transition-transform text-xs ${expandedCategory === category.id ? 'rotate-180' : ''}`}
                    >
                      ▾
                    </span>
                  </Button>
                  {expandedCategory === category.id && (
                    <div className="bg-slate-50 rounded-2xl mx-2 mb-1 py-2 px-1 grid grid-cols-2 gap-1">
                      {category.tools.map((tool) => (
                        <Button
                          key={tool}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToolClick(category.id, tool)}
                          className="justify-start px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-white text-xs"
                        >
                          {tool}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* More accordion */}
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedCategory(expandedCategory === 'more' ? null : 'more')}
                  className="w-full justify-between px-4 py-3 text-slate-700"
                >
                  <span className="font-semibold">More</span>
                  <span
                    className={`transform transition-transform text-xs ${expandedCategory === 'more' ? 'rotate-180' : ''}`}
                  >
                    ▾
                  </span>
                </Button>
                {expandedCategory === 'more' && (
                  <div className="bg-slate-50 rounded-2xl mx-2 mb-1 py-2">
                    {moreCats.map((cat) => (
                      <div key={cat.id}>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-4 pt-3 pb-1">
                          {cat.title}
                        </p>
                        <div className="grid grid-cols-2 gap-1 px-1">
                          {cat.tools.map((tool) => (
                            <Button
                              key={tool}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToolClick(cat.id, tool)}
                              className="justify-start px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-white text-xs"
                            >
                              {tool}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
