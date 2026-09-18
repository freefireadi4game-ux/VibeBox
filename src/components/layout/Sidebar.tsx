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
  Sparkles,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { AudioVisualizer } from '../player/AudioVisualizer';
import { PWAInstallButton } from '../common/PWAInstallButton';

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
    { id: 'library', label: 'Library', icon: Library },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="flex flex-col w-64 h-full bg-[#080911]/90 backdrop-blur-3xl border border-white/[0.08] rounded-3xl p-5 select-none shadow-2xl shadow-black/80">
      {/* Brand Header */}
      <div
        onClick={() => setActivePage('home')}
        className="flex items-center gap-3 cursor-pointer group mb-6 px-1.5 pt-1"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-950/70 group-hover:scale-105 transition-transform border border-white/20">
          <Radio className="w-5 h-5 text-white stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider text-white">VIBEBOX</span>
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-violet-400 rounded-full animate-eq-1" />
                <span className="w-0.5 bg-indigo-400 rounded-full animate-eq-2" />
                <span className="w-0.5 bg-fuchsia-400 rounded-full animate-eq-3" />
              </div>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-violet-400" />
            <span>Cinematic Audio</span>
          </span>
        </div>
      </div>

      {/* Add Song Primary Button */}
      <button
        id="sidebar-add-song-btn"
        onClick={openAddSongModal}
        className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/60 border border-white/15 transition-all active:scale-[0.98] mb-5"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>Add Track</span>
      </button>

      {/* Main Navigation Links */}
      <nav className="space-y-1 mb-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as any)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white/[0.08] text-white border border-white/[0.12] shadow-sm backdrop-blur-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-violet-400 stroke-[2.4]' : 'text-zinc-400 stroke-2'
                }`}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mb-4" />

      {/* Quick Playlists Section */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 no-scrollbar">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Your Playlists
          </span>
          <button
            onClick={() => openCreatePlaylistModal()}
            className="p-1 text-zinc-400 hover:text-violet-300 rounded-lg hover:bg-white/[0.06] transition-colors"
            title="Create new playlist"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0.5">
          {/* Favorites shortcut */}
          <button
            onClick={() => setActivePage('library')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Heart className="w-3.5 h-3.5 text-violet-400 fill-violet-400/20" />
              <span className="truncate font-medium">Favorites</span>
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

      {/* PWA Install */}
      <div className="my-2">
        <PWAInstallButton variant="full" />
      </div>

      {/* Footer Visualizer & Stats */}
      <div className="pt-3 border-t border-white/[0.06] mt-2 space-y-2">
        {isPlaying && currentSong && (
          <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-1 backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
              <span className="font-semibold text-violet-300 uppercase tracking-wider">Visualizer</span>
              <span className="font-mono text-zinc-500 text-[9px]">Live</span>
            </div>
            <AudioVisualizer barCount={18} />
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
          <div className="flex items-center gap-1.5">
            <Music className="w-3 h-3 text-violet-400" />
            <span>{songs.length} Tracks</span>
          </div>

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="p-1 text-zinc-400 hover:text-violet-300 hover:bg-white/[0.06] rounded-lg transition-colors"
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
