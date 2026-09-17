import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  description: string;
  category: 'Playback' | 'Navigation' | 'Audio';
}

const SHORTCUTS: ShortcutItem[] = [
  { key: 'Space', description: 'Play / Pause toggle', category: 'Playback' },
  { key: 'N', description: 'Skip to next track', category: 'Playback' },
  { key: 'P', description: 'Skip to previous track / restart', category: 'Playback' },
  { key: '→', description: 'Seek forward 5 seconds', category: 'Playback' },
  { key: '←', description: 'Seek backward 5 seconds', category: 'Playback' },
  { key: 'S', description: 'Toggle Shuffle mode', category: 'Playback' },
  { key: 'R', description: 'Cycle Repeat mode (1x, 2x, Playlist, Off)', category: 'Playback' },
  { key: '↑', description: 'Volume up (+10%)', category: 'Audio' },
  { key: '↓', description: 'Volume down (-10%)', category: 'Audio' },
  { key: 'M', description: 'Mute / Unmute audio', category: 'Audio' },
  { key: 'F', description: 'Favorite / Unfavorite current track', category: 'Navigation' },
  { key: 'Q', description: 'Open / Close Play Queue', category: 'Navigation' },
  { key: 'V', description: 'Toggle YouTube Video dock', category: 'Navigation' },
  { key: '?', description: 'Show keyboard shortcuts helper', category: 'Navigation' },
  { key: 'Esc', description: 'Close any active modal or full player', category: 'Navigation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories: ('Playback' | 'Audio' | 'Navigation')[] = ['Playback', 'Audio', 'Navigation'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0e1224]/95 border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 z-10 overflow-hidden backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/25">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Keyboard Shortcuts</h3>
                <p className="text-xs text-zinc-400">Control VIBEBOX instantly with your keyboard</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Shortcuts categorized */}
          <div className="py-4 space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {cat} Controls
                </h4>
                <div className="space-y-1.5">
                  {SHORTCUTS.filter((s) => s.category === cat).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <span className="text-xs text-zinc-300">{item.description}</span>
                      <kbd className="px-2 py-0.5 rounded-lg bg-white/[0.08] border border-white/10 text-xs font-mono font-semibold text-violet-300 shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-200 font-mono text-[10px]">?</kbd> anywhere to toggle</span>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-950/40 border border-white/10"
            >
              Got it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
