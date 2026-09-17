import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FolderPlus, Edit3 } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export const CreatePlaylistModal: React.FC = () => {
  const { isCreatePlaylistOpen, closeCreatePlaylistModal, playlistToEdit, createPlaylist, updatePlaylist, setActivePage } =
    useLibrary();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (playlistToEdit) {
      setName(playlistToEdit.name);
      setDescription(playlistToEdit.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [playlistToEdit, isCreatePlaylistOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (playlistToEdit) {
      updatePlaylist(playlistToEdit.id, {
        name: name.trim(),
        description: description.trim(),
      });
    } else {
      const created = createPlaylist(name.trim(), description.trim());
      setActivePage('playlist-detail', created.id);
    }

    closeCreatePlaylistModal();
  };

  if (!isCreatePlaylistOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          onClick={closeCreatePlaylistModal}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#0e1224]/95 border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 z-10 backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/25">
                {playlistToEdit ? <Edit3 className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
              </div>
              <h2 className="text-lg font-bold text-white">
                {playlistToEdit ? 'Edit Playlist' : 'New Playlist'}
              </h2>
            </div>
            <button
              onClick={closeCreatePlaylistModal}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Playlist Name
              </label>
              <input
                id="playlist-name-input"
                type="text"
                placeholder="e.g. Late Night Coding, Workout Mix..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/80 transition-colors"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Description (Optional)
              </label>
              <textarea
                id="playlist-desc-input"
                placeholder="Give your playlist a vibe or summary..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/80 transition-colors resize-none"
              />
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeCreatePlaylistModal}
                className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                id="save-playlist-submit-btn"
                type="submit"
                disabled={!name.trim()}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-950/50 disabled:opacity-40 disabled:pointer-events-none transition-all border border-white/15"
              >
                {playlistToEdit ? 'Save Changes' : 'Create Playlist'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
