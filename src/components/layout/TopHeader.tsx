import React from 'react';
import { Search, Plus, Settings, Radio, Keyboard, ShieldCheck } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface TopHeaderProps {
  onOpenShortcuts?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenShortcuts }) => {
  const { activePage, setActivePage, openAddSongModal } = useLibrary();
  const { isPlaying, currentSong } = usePlayer();

  const getPageTitle = () => {
    switch (activePage) {
      case 'home':
        return 'Home';
      case 'search':
        return 'Search & Discover';
      case 'library':
        return 'Your Music Library';
      case 'playlists':
        return 'Playlists';
      case 'playlist-detail':
        return 'Playlist Overview';
      case 'settings':
        return 'Settings & Preferences';
      default:
        return 'VIBEBOX';
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full h-16 bg-[#080a12]/75 backdrop-blur-2xl border-b border-white/[0.07] px-4 sm:px-8 flex items-center justify-between select-none">
      {/* Left: Mobile brand & Desktop page title */}
      <div className="flex items-center gap-3">
        <div
          className="md:hidden flex items-center gap-2.5 cursor-pointer"
          onClick={() => setActivePage('home')}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-950/60 border border-white/20">
            <Radio className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm tracking-wider text-white">VIBEBOX</span>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-tight">
            {getPageTitle()}
          </h1>
          {currentSong && isPlaying && (
            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[10px] font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-sm shadow-violet-400" />
              <span>Playing</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install Button */}
        <PWAInstallButton variant="header" />

        {/* Quick Search Button with Shortcut indicator */}
        <button
          onClick={() => setActivePage('search')}
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-xs flex items-center gap-2.5 transition-all shadow-sm backdrop-blur-md"
          title="Search your music (or press /)"
        >
          <Search className="w-4 h-4 text-zinc-400" />
          <span className="hidden sm:inline text-zinc-400 font-medium">Search songs, artists...</span>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-zinc-400">
            /
          </kbd>
        </button>

        {/* Add Song Primary Button */}
        <button
          onClick={openAddSongModal}
          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-950/40 border border-white/15 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">Add Song</span>
        </button>

        {/* Keyboard shortcuts trigger */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="hidden sm:flex p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-violet-300 border border-white/[0.08] transition-colors"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={() => setActivePage('settings')}
          className={`p-2 rounded-xl border transition-colors ${
            activePage === 'settings'
              ? 'bg-violet-500/15 border-violet-500/40 text-violet-300 shadow-sm'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-400 hover:text-white'
          }`}
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
