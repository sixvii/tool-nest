import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

function FloatingCard({ cat, style, delay, initialX = 0, initialY = 60, inView, onClick }) {
  const IconComponent = cat.icon;
  const [bgClass, textClass] = cat.color.split(' ');

  return (
    <motion.div
      onClick={onClick}
      className={`absolute flex flex-col items-center gap-1 sm:gap-1.5 ${onClick ? 'cursor-pointer' : ''} ${style}`}
      initial={{ opacity: 0, x: initialX, y: initialY }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: initialX, y: initialY }}
      transition={{ delay, type: 'spring', stiffness: 65, damping: 13 }}
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1], y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.4 }}
        className={`w-9 h-9 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl shadow-lg border-2 border-white flex items-center justify-center ${bgClass} ${textClass}`}
      >
        <IconComponent className="w-4 h-4 sm:w-8 sm:h-8" />
      </motion.div>
      <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-500 whitespace-nowrap bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
        {cat.title.split(' ')[0]}
      </span>
    </motion.div>
  );
}

FloatingCard.propTypes = {
  cat: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    color: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  style: PropTypes.string.isRequired,
  delay: PropTypes.number.isRequired,
  initialX: PropTypes.number,
  initialY: PropTypes.number,
  inView: PropTypes.bool.isRequired,
  onClick: PropTypes.func,
};

export default FloatingCard;
