import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import CategoryTabsFilter from '../components/CategoryTabsFilter';

export default function AllToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-700">All Tools</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CategoryTabsFilter onToolClick={(path) => navigate(path)} />
        </motion.div>
      </div>
    </div>
  );
}
