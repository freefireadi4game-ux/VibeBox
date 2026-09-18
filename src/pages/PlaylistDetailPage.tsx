import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Edit2,
  Trash2,
  Music,
  Plus,
  ArrowUp,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/songs/SongCard';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { formatDuration } from '../../src/services/youtube';

export const PlaylistDetailPage: React.FC = () => {
  const {
    playlists,
    songs,
    selectedPlaylistId,
    setActivePage,
    deletePlaylist,
    removeSongFromPlaylist,
    reorderPlaylistSongs,
    openCreatePlaylistModal,
    openAddSongModal,
    canManagePlaylist,
  } = useLibrary();

  const { playSong } = usePlayer();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  if (!currentPlaylist) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-zinc-400 text-sm">Playlist not found or was removed.</p>
        <button
          onClick={() => setActivePage('playlists')}
          className="px-4 py-2 bg-zinc-800 text-xs font-semibold text-white rounded-xl"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const isOwnerOrAdmin = canManagePlaylist(currentPlaylist);

  // Get songs for this playlist in the ordered sequence
  const songMap = new Map(songs.map((s) => [s.id, s]));
  const playlistSongs = currentPlaylist.songIds
    .map((id) => songMap.get(id))
    .filter((s): s is (typeof songs)[0] => Boolean(s));

  const totalSeconds = playlistSongs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const coverUrl = currentPlaylist.coverUrl || playlistSongs[0]?.thumbnailUrl;

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs, 0);
    }
  };

  const handleShufflePlay = () => {
    if (playlistSongs.length > 0) {
      const rnd = Math.floor(Math.random() * playlistSongs.length);
      playSong(playlistSongs[rnd], playlistSongs, rnd);
    }
  };

  return (
    <div className="space-y-8 pb-28">
      {/* Back button */}
      <button
        onClick={() => setActivePage('playlists')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-violet-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Playlists</span>
      </button>

      {/* Playlist Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#151936]/90 via-[#0e1226]/90 to-[#0a0c18]/95 border border-white/[0.10] shadow-2xl backdrop-blur-xl">
        {/* Cover Artwork */}
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-zinc-800 shrink-0 shadow-2xl shadow-black/80 flex items-center justify-center border border-white/10">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={currentPlaylist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-16 h-16 text-violet-400/60" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-center sm:text-left space-y-2.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="text-[11px] font-extrabold text-violet-400 uppercase tracking-widest">
              PLAYLIST
            </span>
            {currentPlaylist.creatorName && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/10 font-medium">
                Created by {currentPlaylist.creatorName}
              </span>
            )}
            {!isOwnerOrAdmin && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
                Public • View Only
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight break-words">
            {currentPlaylist.name}
          </h1>

          {currentPlaylist.description && (
            <p className="text-sm text-zinc-400 max-w-xl">{currentPlaylist.description}</p>
          )}

          <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-zinc-400 pt-1 font-medium">
            <span>{playlistSongs.length} tracks</span>
            {totalSeconds > 0 && (
              <>
                <span>•</span>
                <span>{formatDuration(totalSeconds)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          {playlistSongs.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-transform active:scale-95 border border-white/15"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play All</span>
              </button>

              <button
                onClick={handleShufflePlay}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
                title="Shuffle Playlist"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </>
          )}

          {isOwnerOrAdmin && (
            <>
              <button
                onClick={() => openCreatePlaylistModal(currentPlaylist)}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
                title="Edit Playlist Details"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/[0.08] transition-colors"
                title="Delete Playlist"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <button
          onClick={openAddSongModal}
          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-violet-300 border border-violet-500/35 text-xs font-semibold flex items-center gap-1.5 transition-colors backdrop-blur-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Song to Library</span>
        </button>
      </div>

      {/* Song List with Reordering */}
      {playlistSongs.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white/[0.03] rounded-3xl border border-white/[0.08] backdrop-blur-md">
          <Music className="w-12 h-12 text-violet-400/60 mx-auto" />
          <h3 className="text-base font-bold text-white">This playlist is empty</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Browse your library or add new YouTube tracks to populate this playlist.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setActivePage('library')}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold text-white transition-colors border border-white/10"
            >
              Browse Library
            </button>
            <button
              onClick={openAddSongModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-xs font-bold text-white transition-colors shadow-lg shadow-indigo-950/50"
            >
              Add New Song
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {playlistSongs.map((song, idx) => (
            <div key={`${song.id}-${idx}`} className="group relative flex items-center gap-1">
              {/* Up / Down reorder quick buttons (only visible if user can manage playlist) */}
              {isOwnerOrAdmin && (
                <div className="hidden group-hover:flex flex-col items-center justify-center shrink-0 pr-1">
                  {idx > 0 && (
                    <button
                      onClick={() => reorderPlaylistSongs(currentPlaylist.id, idx, idx - 1)}
                      className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                  )}
                  {idx < playlistSongs.length - 1 && (
                    <button
                      onClick={() => reorderPlaylistSongs(currentPlaylist.id, idx, idx + 1)}
                      className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Card */}
              <div className="flex-1 min-w-0">
                <SongCard
                  song={song}
                  contextList={playlistSongs}
                  variant="list"
                  index={idx}
                  onRemoveFromPlaylist={
                    isOwnerOrAdmin
                      ? () => removeSongFromPlaylist(currentPlaylist.id, song.id)
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Playlist?"
        message={`Are you sure you want to delete "${currentPlaylist.name}"? The songs inside will still stay safely in your library.`}
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={() => {
          deletePlaylist(currentPlaylist.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
