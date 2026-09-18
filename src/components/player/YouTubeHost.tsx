import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { Video, EyeOff, Maximize2 } from 'lucide-react';

export const YouTubeHost: React.FC = () => {
  const { isVideoVisible, setIsVideoVisible, currentSong, setShowFullPlayer } = usePlayer();

  return (
    <div
      id="vibebox-video-dock-container"
      className={`fixed transition-all duration-300 ${
        isVideoVisible
          ? 'bottom-24 right-4 md:bottom-28 md:right-8 w-72 sm:w-80 md:w-96 aspect-video bg-[#0b0e1d] rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/40 border border-white/15 backdrop-blur-xl opacity-100 pointer-events-auto z-40'
          : 'fixed -bottom-[600px] right-0 w-80 h-48 opacity-0 pointer-events-none z-[-1]'
      }`}
      aria-hidden={!isVideoVisible}
    >
      {isVideoVisible && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-[#0e1224]/80 backdrop-blur-md px-2 py-1 rounded-lg border border-white/15">
          <button
            onClick={() => setShowFullPlayer(true)}
            className="p-1 hover:text-violet-400 text-zinc-300 transition-colors"
            title="Expand to Full Player"
            aria-label="Expand player"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsVideoVisible(false)}
            className="p-1 hover:text-rose-400 text-zinc-300 transition-colors"
            title="Hide Video Dock"
            aria-label="Hide video dock"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* The DOM element required by window.YT.Player */}
      <div id="vibebox-yt-iframe-host" className="w-full h-full" />
    </div>
  );
};
