/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { MusicPlayer } from './components/player/MusicPlayer';
import { MiniPlayer } from './components/player/MiniPlayer';
import { FullPlayer } from './components/player/FullPlayer';
import { YouTubeHost } from './components/player/YouTubeHost';
import { QueueDrawer } from './components/queue/QueueDrawer';
import { AddSongModal } from './components/modals/AddSongModal';
import { CreatePlaylistModal } from './components/modals/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/modals/AddToPlaylistModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { AuthModal } from './components/modals/AuthModal';
import { ToastContainer } from './components/common/Toast';
import { SplashScreen } from './components/common/SplashScreen';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { activePage, recordPlay } = useLibrary();
  const { currentSong, isPlaying, isLoading } = usePlayer();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const lastStartedSongRef = useRef<string | null>(null);

  useKeyboardShortcuts({
    onToggleShortcutsModal: () => setIsShortcutsOpen((prev) => !prev),
  });

  // Track only confirmed playback starts. This is shared by cards, queues,
  // playlists, shuffle, next/previous, and Play All because they all update the player state.
  useEffect(() => {
    if (isLoading) return;
    if (isPlaying && currentSong && lastStartedSongRef.current !== currentSong.id) {
      lastStartedSongRef.current = currentSong.id;
      recordPlay(currentSong.id);
    }
    if (!isPlaying && !currentSong) {
      lastStartedSongRef.current = null;
    }
  }, [currentSong, isPlaying, isLoading, recordPlay]);

  const renderActivePage = () => {
    switch (activePage) {
      case 'home': return <HomePage />;
      case 'search': return <SearchPage />;
      case 'library': return <LibraryPage />;
      case 'playlists': return <PlaylistsPage />;
      case 'playlist-detail': return <PlaylistDetailPage />;
      case 'settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#050609] text-[#f1f4f9] select-none font-sans">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-35 transition-opacity duration-1000">
        {currentSong?.thumbnailUrl ? (
          <div className="absolute -top-[20%] -left-[10%] w-[140%] h-[140%] bg-cover bg-center filter blur-[140px] scale-125 opacity-40 transition-all duration-1000 ease-out" style={{ backgroundImage: `url(${currentSong.thumbnailUrl})` }} />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050609]/70 via-[#050609]/90 to-[#050609]" />
        <div className="absolute -top-40 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="relative z-10 hidden md:flex h-full py-4 pl-4">
        <Sidebar onOpenShortcuts={() => setIsShortcutsOpen(true)} />
      </div>
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopHeader onOpenShortcuts={() => setIsShortcutsOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 md:py-7">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div key={activePage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                {renderActivePage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <MusicPlayer />
      <MiniPlayer />
      <BottomNavigation />
      <FullPlayer />
      <QueueDrawer />
      <YouTubeHost />
      <AddSongModal />
      <CreatePlaylistModal />
      <AddToPlaylistModal />
      <AuthModal />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <LibraryProvider>
        <PlayerProvider>
          <AnimatePresence>
            {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
          </AnimatePresence>
          <AppContent />
        </PlayerProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}
