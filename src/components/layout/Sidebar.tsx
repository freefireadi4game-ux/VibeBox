import React from 'react';
import {
  Home,
  Search,
  Library,
  ListMusic,
  Settings,
  Plus,
  Heart,
  Radio,
  Keyboard,
  Music,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { AudioVisualizer } from '../player/AudioVisualizer';

interface SidebarProps {
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenShortcuts }) => {
  const {
    activePage,
    setActivePage,
    playlists,
    favorites,
    songs,
    openAddSongModal,
    openCreatePlaylistModal,
  } = useLibrary();

  const { isPlaying, currentSong } = usePlayer();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Your Library', icon: Library },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-[#090b14]/75 backdrop-blur-2xl border-r border-white/[0.07] p-5 select-none shrink-0 z-10">
      {/* Brand Logo */}
      <div
        onClick={() => setActivePage('home')}
        className="flex items-center gap-3.5 cursor-pointer group mb-7 px-1"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-950/60 group-hover:scale-105 transition-transform border border-white/20">
          <Radio className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wider text-white">VIBEBOX</span>
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-violet-400 rounded-full animate-eq-1" />
                <span className="w-0.5 bg-indigo-400 rounded-full animate-eq-2" />
                <span className="w-0.5 bg-fuchsia-400 rounded-full animate-eq-3" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
            Glass Sound Studio
          </span>
        </div>
      </div>

      {/* Add Song Primary Button */}
      <button
        id="sidebar-add-song-btn"
        onClick={openAddSongModal}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/60 border border-white/15 transition-all active:scale-[0.98] mb-6"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Add YouTube Song</span>
      </button>

      {/* Main Navigation Links */}
      <nav className="space-y-1.5 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as any)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-white/[0.12] to-white/[0.04] text-white border border-white/[0.12] shadow-sm backdrop-blur-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-zinc-400'}`} />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mb-4" />

      {/* Quick Playlists List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Your Playlists
          </span>
          <button
            onClick={() => openCreatePlaylistModal()}
            className="p-1 text-zinc-400 hover:text-violet-400 rounded-lg hover:bg-white/[0.05] transition-colors"
            title="Create new playlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          {/* Favorites shortcut */}
          <button
            onClick={() => setActivePage('library')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-violet-300 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Heart className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
              <span className="truncate font-medium">Your Favorites</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-300">
              {favorites.length}
            </span>
          </button>

          {/* User Playlists */}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setActivePage('playlist-detail', pl.id)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors group"
            >
              <span className="truncate pr-2">{pl.name}</span>
              <span className="text-[10px] text-zinc-600 font-mono group-hover:text-zinc-400">
                {pl.songIds.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Footer: Library stats & Shortcuts trigger */}
      <div className="pt-3 border-t border-white/[0.06] mt-2 space-y-2">
        {isPlaying && currentSong && (
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-2 backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span className="font-semibold text-violet-400 uppercase tracking-wider">Atmospheric Spectrum</span>
              <span className="font-mono text-zinc-500">Live</span>
            </div>
            <AudioVisualizer barCount={18} />
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
          <div className="flex items-center gap-1.5">
            <Music className="w-3 h-3 text-violet-400" />
            <span>{songs.length} Tracks Saved</span>
          </div>

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1 text-zinc-400 hover:text-violet-400 hover:bg-white/[0.05] rounded-lg transition-colors"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
