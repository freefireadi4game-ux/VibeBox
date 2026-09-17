import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useLibrary();

  return (
    <div
      id="vibebox-toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl backdrop-blur-2xl border shadow-xl text-sm ${
              toast.type === 'success'
                ? 'bg-[#0e1224]/90 border-emerald-500/40 text-emerald-100 shadow-indigo-950/40'
                : toast.type === 'error'
                ? 'bg-[#0e1224]/90 border-rose-500/40 text-rose-100 shadow-rose-950/40'
                : 'bg-[#0e1224]/90 border-white/[0.12] text-zinc-100 shadow-indigo-950/40'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-violet-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs leading-snug">{toast.title}</p>
              {toast.message && (
                <p className="text-xs opacity-80 mt-0.5 truncate">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
