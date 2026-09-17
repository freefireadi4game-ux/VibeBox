/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { PlayerProvider } from './context/PlayerContext';
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
import { ToastContainer } from './components/common/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { activePage } = useLibrary();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Bind global keyboard shortcuts (Space, Arrows, M, S, R, N, P, Q, V, ?, Esc)
  useKeyboardShortcuts({
    onToggleShortcutsModal: () => setIsShortcutsOpen((prev) => !prev),
  });

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage />;
      case 'search':
        return <SearchPage />;
      case 'library':
        return <LibraryPage />;
      case 'playlists':
        return <PlaylistsPage />;
      case 'playlist-detail':
        return <PlaylistDetailPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c10] text-[#f1f3f7]">
      {/* Desktop Sidebar */}
      <Sidebar onOpenShortcuts={() => setIsShortcutsOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopHeader onOpenShortcuts={() => setIsShortcutsOpen(true)} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {renderActivePage()}
        </main>
      </div>

      {/* Desktop Bottom Player */}
      <MusicPlayer />

      {/* Mobile Mini Player */}
      <MiniPlayer />

      {/* Mobile Bottom Nav */}
      <BottomNavigation />

      {/* Fullscreen Player Modal */}
      <FullPlayer />

      {/* Queue Drawer */}
      <QueueDrawer />

      {/* Embedded YouTube Host */}
      <YouTubeHost />

      {/* Action Modals */}
      <AddSongModal />
      <CreatePlaylistModal />
      <AddToPlaylistModal />
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Toasts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <LibraryProvider>
      <PlayerProvider>
        <AppContent />
      </PlayerProvider>
    </LibraryProvider>
  );
}
