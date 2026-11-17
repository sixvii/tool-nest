import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Search, X, LayoutGrid } from 'lucide-react';
import { categoriesData } from '../data/toolsData';
import { searchTools } from '../utils/searchTools';
import FeaturedToolCard from '../components/FeaturedToolCard';
import FloatingCard from '../components/FloatingCard';
import Breadcrumb from '../components/Breadcrumb';
import SubToolsView from '../components/SubToolsView';
import {
  PLACEHOLDER_TOOLS,
  FLOATING_ICON_POSITIONS,
  DEFAULT_FEATURED_TOOLS,
  TRUST_BADGES,
} from '../constants/homeConstants';
import { loadRecentSearches, addRecentSearch } from '../utils/recentSearches';

export default function Home() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const activeCategory = categoriesData.find((c) => c.id === category);

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.replace('#', ''));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  const [heroQuery, setHeroQuery] = useState('');
  const [heroFocused, setHeroFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const heroSearchRef = useRef(null);
  const heroResults = heroQuery ? searchTools(heroQuery) : [];
  const showHeroResults = heroFocused && heroQuery.length > 0;

  useEffect(() => {
    const id = setInterval(
      () => setPlaceholderIdx((p) => (p + 1) % PLACEHOLDER_TOOLS.length),
      2500
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (heroSearchRef.current && !heroSearchRef.current.contains(e.target)) setHeroFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleHeroResultClick = (categoryId, toolName, categoryTitle) => {
    addRecentSearch(categoryId, toolName, categoryTitle);
    navigate(`/${categoryId}/${encodeURIComponent(toolName)}`);
    setHeroQuery('');
    setHeroFocused(false);
  };

  const [featuredTools, setFeaturedTools] = useState(DEFAULT_FEATURED_TOOLS);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [featuredReady, setFeaturedReady] = useState(false);

  useEffect(() => {
    const recent = loadRecentSearches();
    const t = setTimeout(() => {
      if (recent.length >= 2) {
        const blended =
          recent.length >= 7
            ? recent.slice(0, 12)
            : [...recent, ...DEFAULT_FEATURED_TOOLS].slice(0, 12);
        setFeaturedTools(blended);
        setIsPersonalized(true);
      }
      setFeaturedReady(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  if (activeCategory) {
    return (
      <div className="min-h-screen bg-slate-50/60 text-slate-800 pb-12">
        <Breadcrumb category={activeCategory} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <SubToolsView activeCategory={activeCategory} onSubToolClick={(path) => navigate(path)} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ── Hero ── */}
      <section
        id="home"
        className="min-h-[calc(100vh-5rem)] relative flex flex-col items-center justify-center text-center px-12 sm:px-4 pt-20 pb-8"
      >
        <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-blue-50 opacity-70 blur-3xl" />
        </div>

        {FLOATING_ICON_POSITIONS.map(({ catIndex, style, delay, initialX, initialY }) => (
          <FloatingCard
            key={catIndex}
            cat={categoriesData[catIndex]}
            style={style}
            delay={delay}
            initialX={initialX}
            initialY={initialY}
            inView={true}
            onClick={() => navigate(`/category/${categoriesData[catIndex].id}`)}
          />
        ))}

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-2xl"
        >
          Work faster with{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            150+ powerful tools.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-slate-500 text-sm sm:text-lg mt-4 max-w-[240px] sm:max-w-xl"
        >
          Every file tool you need — PDF, image, video, audio & more — in one fast, free workspace.
          No sign-up required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex items-center gap-2 sm:gap-3 mt-5 flex-wrap justify-center"
        >
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full"
            >
              {badge}
            </span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-xl mt-7 relative z-10"
          ref={heroSearchRef}
        >
          <div className="flex items-center bg-white border-2 border-slate-200 rounded-full px-5 py-4 shadow-md hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div className="w-px h-5 bg-slate-200 mx-3 flex-shrink-0" />
            <input
              type="text"
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              onFocus={() => setHeroFocused(true)}
              placeholder={PLACEHOLDER_TOOLS[placeholderIdx]}
              className="flex-1 bg-transparent outline-none text-base text-slate-700 placeholder:text-slate-400"
            />
            {heroQuery && (
              <button
                onClick={() => {
                  setHeroQuery('');
                  setHeroFocused(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showHeroResults && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
              {heroResults.length > 0 ? (
                heroResults.map((tool, idx) => (
                  <motion.button
                    key={`${tool.categoryId}-${tool.name}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.045 }}
                    onClick={() => handleHeroResultClick(tool.categoryId, tool.name, tool.category)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between gap-3 border-b border-slate-50 last:border-b-0 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">{tool.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 whitespace-nowrap">
                      {tool.category}
                    </span>
                  </motion.button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-slate-400">No tools found.</p>
              )}
            </div>
          )}
        </motion.div>

        <motion.a
          href="#tools"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
          transition={{
            opacity: { duration: 0.7, delay: 0.6 },
            y: { duration: 0.7, delay: 0.6 },
            scale: { duration: 2.5, delay: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' },
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="mt-5 px-7 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 text-sm"
        >
          Explore Tools ↓
        </motion.a>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mt-10 text-slate-300 cursor-pointer hover:text-slate-400 transition-colors"
          onClick={() =>
            document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* ── Category Grid ── */}
      <motion.section
        id="categories"
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 40 }}
        viewport={{ once: false, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="py-8 sm:py-12"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Browse by Category</h2>
          <p className="text-slate-500 text-sm mt-1">Pick a category to explore all its tools</p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 1.03, y: -4 }}
            transition={{ duration: 0.2 }}
            onClick={() => navigate('/tools')}
            className="bg-blue-50 rounded-3xl border border-blue-100 p-5 sm:p-6 cursor-pointer hover:shadow-xl hover:border-blue-200 transition-all"
          >
            <div className="p-3 rounded-2xl w-fit mb-4 bg-white border border-blue-100">
              <LayoutGrid className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">All Tools</h3>
            <p className="text-blue-600 text-sm mt-1 font-semibold">150+ tools</p>
            <p className="text-slate-500 text-xs mt-1 line-clamp-2">Browse everything</p>
          </motion.div>

          {categoriesData.map((cat) => (
            <motion.div
              key={cat.id}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 1.03, y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/category/${cat.id}`)}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 cursor-pointer hover:shadow-xl transition-all"
            >
              <div className={`p-3 rounded-2xl w-fit mb-4 border ${cat.color}`}>
                <cat.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">{cat.title}</h3>
              <p className="text-slate-400 text-sm mt-1">{cat.count}</p>
              <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">{cat.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── Popular Tools ── */}
      <motion.section
        id="featured"
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 40 }}
        viewport={{ once: false, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="py-8 sm:py-12 bg-slate-50/60"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Popular Tools</h2>
            <p className="text-slate-500 text-sm mt-1">
              {isPersonalized
                ? 'Based on your recent activity'
                : 'Our most-used tools — click any to start instantly'}
            </p>
          </div>
          <div className="space-y-4">
            {featuredReady ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.5 }}
                  >
                    <FeaturedToolCard tool={featuredTools[0]} variant="large" />
                  </motion.div>
                  <div className="flex flex-col gap-3">
                    {featuredTools.slice(1, 4).map((tool, i) => (
                      <motion.div
                        key={`${tool.categoryId}-${tool.name}-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: false }}
                        transition={{ duration: 0.4, delay: i * 0.08 }}
                      >
                        <FeaturedToolCard tool={tool} variant="medium" />
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {featuredTools.slice(4, 7).map((tool, i) => (
                    <motion.div
                      key={`${tool.categoryId}-${tool.name}-sm-${i}`}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                    >
                      <FeaturedToolCard tool={tool} variant="small" />
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="skeleton rounded-3xl min-h-[320px]" />
                  <div className="flex flex-col gap-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="skeleton rounded-2xl h-[76px]" />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton rounded-2xl h-[60px]" />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.section>

      {/* ── All Tools ── */}
      <motion.section
        id="tools"
        whileInView={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 40 }}
        viewport={{ once: false, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="py-10 sm:py-14 text-center px-4"
      >
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Explore Every Tool</h2>
        <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
          Browse and filter all 160+ tools by category — PDF, image, video, audio, text, and more.
        </p>
        <button
          onClick={() => navigate('/tools')}
          className="mt-6 px-8 py-3.5 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 text-sm"
        >
          Browse All Tools →
        </button>
      </motion.section>
    </div>
  );
}
