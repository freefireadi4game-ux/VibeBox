import React from 'react';
import { Plus, ListMusic, Heart, Clock, Music } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { PlaylistCard } from '../components/playlists/PlaylistCard';

export const PlaylistsPage: React.FC = () => {
  const { playlists, favorites, recentlyPlayed, openCreatePlaylistModal, setActivePage } =
    useLibrary();

  return (
    <div className="space-y-8 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Your Playlists</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Organize and curate your favorite YouTube tracks into custom vibes.
          </p>
        </div>

        <button
          onClick={() => openCreatePlaylistModal()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 transition-transform active:scale-95 border border-white/15"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* System Smart Playlists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Favorites Smart Tile */}
        <div
          onClick={() => setActivePage('library')}
          className="p-5 rounded-3xl bg-gradient-to-br from-violet-950/40 via-[#0e1224]/80 to-[#0a0c18] border border-violet-500/25 hover:border-violet-500/50 transition-all cursor-pointer group flex items-center gap-4 shadow-xl backdrop-blur-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-violet-500/30">
            <Heart className="w-8 h-8 fill-violet-500/30 text-violet-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider block mb-0.5">
              Smart Collection
            </span>
            <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors truncate">
              Your Favorites
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {favorites.length} {favorites.length === 1 ? 'track' : 'tracks'} you've loved
            </p>
          </div>
        </div>

        {/* Recently Played Smart Tile */}
        <div
          onClick={() => setActivePage('library')}
          className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[#0e1224]/80 to-[#0a0c18] border border-indigo-500/25 hover:border-indigo-500/50 transition-all cursor-pointer group flex items-center gap-4 shadow-xl backdrop-blur-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-indigo-500/30">
            <Clock className="w-8 h-8 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-0.5">
              History
            </span>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
              Recently Played
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {recentlyPlayed.length} {recentlyPlayed.length === 1 ? 'track' : 'tracks'} recently in rotation
            </p>
          </div>
        </div>
      </div>

      {/* User Custom Playlists */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">Custom Playlists</h3>

        {playlists.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-center space-y-3 backdrop-blur-md">
            <ListMusic className="w-12 h-12 text-violet-400/60 mx-auto" />
            <h4 className="text-base font-bold text-white">No playlists yet</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Create custom playlists to group your favorite chillout sessions, workout music, or study jams.
            </p>
            <button
              onClick={() => openCreatePlaylistModal()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-950/50"
            >
              Create Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {playlists.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
