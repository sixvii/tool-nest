import { ArrowRight } from 'lucide-react';
import { Card, Badge } from './ui';

export default function ToolCard({ cat, onClick }) {
  const IconComponent = cat.icon;
  return (
    <Card
      hover
      onClick={onClick}
      className="relative overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[220px]"
    >
      <div
        className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-125 ${cat.color.split(' ')[0]}`}
      />

      <div>
        <Badge className={`mb-3 sm:mb-4 ${cat.color}`}>{cat.count}</Badge>

        <div
          className={`p-2 sm:p-3 rounded-2xl w-fit mb-3 sm:mb-4 ${cat.color.split(' ')[0]} ${cat.color.split(' ')[1]}`}
        >
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <h3 className="text-base sm:text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
          {cat.title}
        </h3>
        <p className="text-slate-400 text-[10px] sm:text-xs mt-1">{cat.desc}</p>
      </div>

      <div className="border-t border-slate-50 pt-3 sm:pt-4 mt-4 sm:mt-6 flex justify-between items-center text-xs gap-2">
        <div className="min-w-0">
          <span className="text-slate-400 block text-[8px] sm:text-[10px] uppercase tracking-wider font-medium">
            Featured Tool
          </span>
          <span className="font-bold text-slate-700 text-[10px] sm:text-xs truncate">
            {cat.featured}
          </span>
        </div>
        <div className="p-2 bg-slate-50 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 flex-shrink-0">
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
        </div>
      </div>
    </Card>
  );
}
