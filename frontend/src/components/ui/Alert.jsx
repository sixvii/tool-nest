import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';

const variants = {
  error: {
    box: 'border-red-100 bg-red-50/40',
    text: 'text-red-700',
    Icon: AlertCircle,
    iconClass: 'text-red-500',
  },
  success: {
    box: 'border-emerald-100 bg-emerald-50/20',
    text: 'text-emerald-700',
    Icon: CheckCircle,
    iconClass: 'text-emerald-500',
  },
};

export default function Alert({ variant = 'error', message, show = true, className = '' }) {
  const { box, text, Icon, iconClass } = variants[variant] ?? variants.error;

  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`overflow-hidden border rounded-2xl p-4 flex items-start gap-3 ${box} ${className}`}
        >
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
          <p className={`text-sm font-medium ${text}`}>{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
