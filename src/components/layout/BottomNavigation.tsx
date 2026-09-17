import React from 'react';
import { Home, Search, Library, ListMusic, Settings, Plus } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { ActivePage } from '../../types';

export const BottomNavigation: React.FC = () => {
  const { activePage, setActivePage, openAddSongModal } = useLibrary();

  const navTabs: { id: ActivePage; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      id="vibebox-mobile-nav"
      className="md:hidden fixed bottom-2.5 left-3 right-3 h-16 bg-[#090b16]/85 border border-white/[0.1] backdrop-blur-2xl rounded-2xl flex items-center justify-around px-1.5 z-30 select-none shadow-2xl shadow-black/90"
    >
      {navTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activePage === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[44px] transition-all relative rounded-xl ${
              isActive ? 'text-violet-300' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            aria-label={tab.label}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-white/[0.08] shadow-sm' : ''
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5] text-violet-400' : 'stroke-2'}`} />
            </div>
            <span className={`text-[10px] font-medium mt-0.5 tracking-tight ${isActive ? 'font-semibold text-white' : ''}`}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-400 shadow-sm shadow-violet-400" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
