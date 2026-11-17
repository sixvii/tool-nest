import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Card, Button } from './ui';

export default function SubToolsView({ activeCategory, onSubToolClick }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card padding="lg">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">
            {activeCategory.title} Features
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Select a utility tool to open its dedicated workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-h-[60vh] overflow-y-auto pr-2">
          {activeCategory.tools.map((tool, idx) => (
            <Button
              key={idx}
              variant="ghost"
              size="sm"
              onClick={() => onSubToolClick(`/${activeCategory.id}/${encodeURIComponent(tool)}`)}
              className="justify-between text-left font-semibold text-slate-700 hover:text-blue-700 min-h-[44px] sm:min-h-auto"
            >
              <span className="truncate mr-1 sm:mr-2">{tool}</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity flex-shrink-0" />
            </Button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
