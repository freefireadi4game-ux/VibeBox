import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ListMusic, Plus } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const AddToPlaylistModal: React.FC = () => {
  const {
    songToAddToPlaylist,
    closeAddToPlaylistModal,
    playlists,
    addSongToPlaylist,
    removeSongFromPlaylist,
    openCreatePlaylistModal,
  } = useLibrary();

  if (!songToAddToPlaylist) return null;

  const togglePlaylistSelection = (playlistId: string, isIncluded: boolean) => {
    if (isIncluded) {
      removeSongFromPlaylist(playlistId, songToAddToPlaylist.id);
    } else {
      addSongToPlaylist(playlistId, songToAddToPlaylist.id);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          onClick={closeAddToPlaylistModal}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#0e1224]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl shadow-indigo-950/50 z-10 flex flex-col max-h-[85vh] backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-base font-bold text-white">Add to Playlist</h2>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{songToAddToPlaylist.title}</p>
            </div>
            <button
              onClick={closeAddToPlaylistModal}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Playlist list */}
          <div className="flex-1 overflow-y-auto py-3 space-y-1.5 pr-1">
            {playlists.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 space-y-2">
                <ListMusic className="w-8 h-8 mx-auto opacity-40 text-violet-400" />
                <p className="text-xs">No playlists found</p>
              </div>
            ) : (
              playlists.map((pl) => {
                const isIncluded = pl.songIds.includes(songToAddToPlaylist.id);
                return (
                  <button
                    key={pl.id}
                    onClick={() => togglePlaylistSelection(pl.id, isIncluded)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isIncluded
                        ? 'bg-violet-950/40 border-violet-500/40 text-violet-200'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-zinc-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-sm font-medium truncate">{pl.name}</p>
                      <p className="text-xs text-zinc-500">{pl.songIds.length} tracks</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                        isIncluded
                          ? 'bg-violet-500 border-violet-500 text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isIncluded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with new playlist button */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <button
              onClick={() => {
                closeAddToPlaylistModal();
                openCreatePlaylistModal();
              }}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-violet-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Playlist</span>
            </button>
            <button
              onClick={closeAddToPlaylistModal}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 rounded-xl transition-colors shadow-md shadow-indigo-950/40 border border-white/10"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
