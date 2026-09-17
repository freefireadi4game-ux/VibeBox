import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#0e1224]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl shadow-indigo-950/50 z-10 backdrop-blur-2xl"
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl shrink-0 border ${
                  isDestructive
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{message}</p>
              </div>
              <button
                onClick={onCancel}
                className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                id="modal-cancel-btn"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition-colors border border-white/[0.06]"
              >
                {cancelLabel}
              </button>
              <button
                id="modal-confirm-btn"
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-md ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-indigo-950/50'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
