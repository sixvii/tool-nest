import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Check, AlertCircle, X } from 'lucide-react';

export function ToastShell({ visible, role, ariaLive, children }) {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={`flex items-center gap-4 bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-4 w-[min(26rem,90vw)] transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  );
}

export function DownloadToast({ t, filename, sizeBytes }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const sizeLabel = sizeBytes ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB` : null;

  return (
    <ToastShell visible={t.visible} role="status" ariaLive="polite">
      <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="downloading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-50 flex items-center justify-center"
            >
              <Download className="w-6 h-6 text-slate-700" />
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ originX: 0 }}
                className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-500"
              />
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center"
            >
              <Check className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-slate-800 truncate">{filename}</p>
        {sizeLabel && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            File size: <span className="text-slate-600 normal-case">{sizeLabel}</span>
          </p>
        )}
      </div>
    </ToastShell>
  );
}

export function ErrorToast({ t, message }) {
  return (
    <ToastShell visible={t.visible} role="alert" ariaLive="assertive">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-red-400 uppercase tracking-wide">Error</p>
        <p className="text-base font-semibold text-slate-800">{message}</p>
      </div>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="text-slate-300 hover:text-slate-500 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>
    </ToastShell>
  );
}

export function SuccessToast({ t, message }) {
  return (
    <ToastShell visible={t.visible} role="status" ariaLive="polite">
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center flex-shrink-0">
        <Check className="w-6 h-6 text-white" />
      </div>
      <p className="text-base font-semibold text-slate-800">{message}</p>
    </ToastShell>
  );
}
