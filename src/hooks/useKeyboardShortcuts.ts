import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useLibrary } from '../context/LibraryContext';

interface UseKeyboardShortcutsOptions {
  onToggleShortcutsModal: () => void;
}

export const useKeyboardShortcuts = ({ onToggleShortcutsModal }: UseKeyboardShortcutsOptions) => {
  const {
    currentSong,
    currentTime,
    duration,
    volume,
    playbackMode,
    showFullPlayer,
    showQueueModal,
    isVideoVisible,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    nextSong,
    prevSong,
    setPlaybackMode,
    cyclePlaybackMode,
    setShowFullPlayer,
    setShowQueueModal,
    setIsVideoVisible,
  } = usePlayer();

  const { toggleFavorite } = useLibrary();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside text inputs or textareas or contenteditables
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      switch (e.key) {
        case ' ': // Spacebar: Play/Pause
          e.preventDefault();
          togglePlay();
          break;

        case 'ArrowRight': // Seek +5s
          e.preventDefault();
          if (duration > 0) {
            seekTo(Math.min(duration, currentTime + 5));
          }
          break;

        case 'ArrowLeft': // Seek -5s
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 5));
          break;

        case 'ArrowUp': // Volume +10%
          e.preventDefault();
          setVolume(Math.min(100, volume + 10));
          break;

        case 'ArrowDown': // Volume -10%
          e.preventDefault();
          setVolume(Math.max(0, volume - 10));
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;

        case 's':
        case 'S':
          e.preventDefault();
          setPlaybackMode(playbackMode === 'shuffle' ? 'normal' : 'shuffle');
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          cyclePlaybackMode();
          break;

        case 'n':
        case 'N':
          e.preventDefault();
          nextSong();
          break;

        case 'p':
        case 'P':
          e.preventDefault();
          prevSong();
          break;

        case 'f':
        case 'F':
          if (currentSong) {
            e.preventDefault();
            toggleFavorite(currentSong.id);
          }
          break;

        case 'q':
        case 'Q':
          e.preventDefault();
          setShowQueueModal(!showQueueModal);
          break;

        case 'v':
        case 'V':
          e.preventDefault();
          setIsVideoVisible(!isVideoVisible);
          break;

        case '?':
          e.preventDefault();
          onToggleShortcutsModal();
          break;

        case 'Escape':
          if (showFullPlayer) setShowFullPlayer(false);
          if (showQueueModal) setShowQueueModal(false);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentSong,
    currentTime,
    duration,
    volume,
    playbackMode,
    showFullPlayer,
    showQueueModal,
    isVideoVisible,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    nextSong,
    prevSong,
    setPlaybackMode,
    cyclePlaybackMode,
    setShowFullPlayer,
    setShowQueueModal,
    setIsVideoVisible,
    toggleFavorite,
    onToggleShortcutsModal,
  ]);
};
