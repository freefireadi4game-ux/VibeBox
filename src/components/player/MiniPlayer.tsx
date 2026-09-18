import React from 'react';
import { Play, Pause, SkipForward, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';

export const MiniPlayer: React.FC = () => {
  const { currentSong, isPlaying, togglePlay, nextSong, currentTime, duration, setShowFullPlayer } =
    usePlayer();
  const { toggleFavorite } = useLibrary();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <motion.div
      id="vibebox-mini-player"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      onClick={() => setShowFullPlayer(true)}
      className="md:hidden fixed bottom-[84px] left-3 right-3 z-30 bg-[#070913]/95 border border-white/[0.1] rounded-2xl shadow-2xl shadow-black/90 backdrop-blur-2xl overflow-hidden cursor-pointer select-none"
    >
      {/* Top progress indicator line */}
      <div className="w-full h-[2px] bg-white/[0.08]">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between p-2.5 gap-3">
        {/* Artwork with circular indicator and equalizer */}
        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
          {/* Subtle circular SVG ring */}
          <svg className="absolute -inset-0.5 w-12 h-12 pointer-events-none -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="2"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray={126}
              strokeDashoffset={126 - (126 * progressPercent) / 100}
              strokeLinecap="round"
              className={isPlaying ? 'transition-all duration-300' : ''}
            />
          </svg>

          {/* Center circular artwork */}
          <div
            className={`relative w-9 h-9 rounded-full overflow-hidden shrink-0 bg-zinc-900 border border-white/10 shadow-sm transition-transform ${
              isPlaying ? 'scale-100 ring-2 ring-violet-500/40' : 'scale-95 opacity-90'
            }`}
          >
            <img
              src={currentSong.thumbnailUrl}
              alt={currentSong.title}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 bg-violet-400 rounded-full animate-eq-1" />
                  <span className="w-0.5 bg-indigo-400 rounded-full animate-eq-2" />
                  <span className="w-0.5 bg-fuchsia-400 rounded-full animate-eq-3" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Track Title & Artist */}
        <div className="flex-1 min-w-0 pr-1">
          <p className="text-xs font-semibold text-white truncate tracking-tight">{currentSong.title}</p>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{currentSong.channel}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleFavorite(currentSong.id)}
            className="p-2 text-zinc-400 hover:text-violet-300 transition-colors"
            aria-label="Favorite"
          >
            <Heart
              className={`w-4 h-4 ${currentSong.isFavorite ? 'fill-violet-400 text-violet-400' : ''}`}
            />
          </button>

          <button
            onClick={togglePlay}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-md shadow-indigo-950/60 border border-white/20 transition-transform active:scale-95"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-2 text-zinc-400 hover:text-white transition-colors active:scale-95"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
