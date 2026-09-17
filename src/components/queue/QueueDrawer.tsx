import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ArrowUp, ArrowDown, Play, Music, ListMusic } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatDuration } from '../../services/youtube';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    queueIndex,
    currentSong,
    isPlaying,
    showQueueModal,
    setShowQueueModal,
    playSong,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = usePlayer();

  const { addToast } = useLibrary();

  const handleClear = () => {
    clearQueue();
    addToast('Queue cleared', '', 'info');
  };

  return (
    <AnimatePresence>
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex justify-end select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
            onClick={() => setShowQueueModal(false)}
          />

          {/* Drawer content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-md h-full bg-[#0b0e1d]/95 backdrop-blur-2xl border-l border-white/[0.1] p-6 flex flex-col shadow-2xl shadow-indigo-950/50 z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-violet-500/15 text-violet-400 border border-violet-500/25">
                  <ListMusic className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Play Queue</h2>
                  <p className="text-xs text-zinc-400">
                    {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {queue.length > 1 && (
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-white/[0.08] transition-colors"
                    title="Clear queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
                <button
                  onClick={() => setShowQueueModal(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  aria-label="Close queue"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Now Playing section */}
              {currentSong && (
                <div>
                  <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider block mb-2 px-1">
                    Now Playing
                  </span>
                  <div className="p-3.5 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center gap-3 shadow-lg shadow-violet-950/20 backdrop-blur-md">
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-violet-500/40"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-violet-200 truncate">
                        {currentSong.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{currentSong.channel}</p>
                    </div>
                    {/* Equalizer animation */}
                    {isPlaying ? (
                      <div className="flex items-end gap-1 h-4 shrink-0 px-1">
                        <span className="w-1 bg-violet-400 rounded-full animate-eq-1" />
                        <span className="w-1 bg-violet-400 rounded-full animate-eq-2" />
                        <span className="w-1 bg-violet-400 rounded-full animate-eq-3" />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono">Paused</span>
                    )}
                  </div>
                </div>
              )}

              {/* Next in Queue */}
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-1">
                  Next In Queue
                </span>

                {queue.length <= 1 ? (
                  <div className="py-12 text-center text-zinc-500 space-y-2">
                    <Music className="w-8 h-8 mx-auto opacity-30 text-violet-400" />
                    <p className="text-sm font-medium text-zinc-400">Queue is empty</p>
                    <p className="text-xs text-zinc-500">
                      Add songs from your library, search results, or playlists
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((song, idx) => {
                      if (idx === queueIndex) return null; // Already shown as Now Playing
                      const isUpcoming = idx > queueIndex;
                      return (
                        <div
                          key={`${song.id}-${idx}`}
                          className={`group flex items-center gap-2.5 p-2.5 rounded-2xl transition-all ${
                            isUpcoming
                              ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-violet-500/30'
                              : 'bg-black/20 opacity-50 hover:opacity-100 border border-transparent'
                          }`}
                        >
                          <span className="text-xs font-mono text-zinc-500 w-5 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 group/thumb border border-white/5">
                            <img
                              src={song.thumbnailUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => playSong(song, queue, idx)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity"
                              title="Play this song"
                            >
                              <Play className="w-4 h-4 fill-white" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-violet-300 transition-colors">
                              {song.title}
                            </p>
                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {song.channel}
                            </p>
                          </div>

                          <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                            {formatDuration(song.duration)}
                          </span>

                          {/* Reorder controls */}
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx > 0 && (
                              <button
                                onClick={() => reorderQueue(idx, idx - 1)}
                                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {idx < queue.length - 1 && (
                              <button
                                onClick={() => reorderQueue(idx, idx + 1)}
                                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => removeFromQueue(idx)}
                              className="p-1 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-white/10"
                              title="Remove"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
