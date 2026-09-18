import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  Volume1,
  VolumeX,
  Heart,
  ListMusic,
  Maximize2,
  Video,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { useLibrary } from '../../context/LibraryContext';
import { formatDuration } from '../../services/youtube';
import { RepeatModeSelector } from './RepeatModeSelector';
import { AudioVisualizer } from './AudioVisualizer';

export const MusicPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackMode,
    queue,
    isVideoVisible,
    error,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    nextSong,
    prevSong,
    setPlaybackMode,
    setShowFullPlayer,
    setShowQueueModal,
    setIsVideoVisible,
  } = usePlayer();

  const { toggleFavorite } = useLibrary();
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);

  if (!currentSong) return null;

  const isShuffleActive = playbackMode === 'shuffle';

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekTo(val);
  };

  const toggleShuffle = () => {
    if (isShuffleActive) {
      setPlaybackMode('normal');
    } else {
      setPlaybackMode('shuffle');
    }
  };

  return (
    <div
      id="vibebox-desktop-player"
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-22 bg-[#06070c]/90 border-t border-white/[0.08] backdrop-blur-3xl px-6 items-center justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] select-none"
    >
      {/* 1. Track Info (Left) */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[220px] max-w-[340px]">
        <div
          onClick={() => setShowFullPlayer(true)}
          className="relative w-13 h-13 rounded-2xl overflow-hidden shrink-0 group cursor-pointer bg-zinc-900 border border-white/10 shadow-lg shadow-black/60"
        >
          <img
            src={currentSong.thumbnailUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4
              onClick={() => setShowFullPlayer(true)}
              className="text-xs font-bold text-zinc-100 hover:text-violet-300 truncate cursor-pointer transition-colors tracking-tight"
              title={currentSong.title}
            >
              {currentSong.title}
            </h4>
            {error && (
              <span title={error} className="text-amber-400 shrink-0">
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
            <span>{currentSong.channel}</span>
            <span className="text-[9px] text-zinc-500 font-mono uppercase">• Lossless</span>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => toggleFavorite(currentSong.id)}
            className={`p-1.5 rounded-xl transition-colors ${
              currentSong.isFavorite
                ? 'text-violet-400 hover:text-violet-300'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
            title={currentSong.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-label="Toggle favorite"
          >
            <Heart className={`w-4 h-4 ${currentSong.isFavorite ? 'fill-violet-400' : ''}`} />
          </button>

          {/* Toggle Video Dock */}
          <button
            onClick={() => setIsVideoVisible(!isVideoVisible)}
            className={`p-1.5 rounded-xl transition-colors ${
              isVideoVisible
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
            title={isVideoVisible ? 'Hide Official Video Window (V)' : 'Watch Official YouTube Video (V)'}
            aria-label="Toggle YouTube video"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Controls & Progress Bar (Center) */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-2xl px-4">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-1.5 rounded-xl transition-all relative ${
              isShuffleActive
                ? 'text-violet-300 bg-violet-500/20 border border-violet-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
            title={`Shuffle: ${isShuffleActive ? 'On' : 'Off'} (S)`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={prevSong}
            className="p-1.5 text-zinc-300 hover:text-white transition-transform hover:scale-110 active:scale-95"
            title="Previous (P)"
            aria-label="Previous track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/70 border border-white/20 transform hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-white" />
            ) : (
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-1.5 text-zinc-300 hover:text-white transition-transform hover:scale-110 active:scale-95"
            title="Next Track (N)"
            aria-label="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Repeat Mode & Repeat Count Selector */}
          <RepeatModeSelector variant="compact" />
        </div>

        {/* Progress Bar & Timestamps */}
        <div
          className="w-full flex items-center gap-3"
          onMouseEnter={() => setIsHoveringSeek(true)}
          onMouseLeave={() => setIsHoveringSeek(false)}
        >
          <span className="text-[10px] font-mono text-zinc-400 w-9 text-right">
            {formatDuration(currentTime)}
          </span>

          <div className="relative flex-1 flex items-center group cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1 bg-white/[0.08] group-hover:h-1.5 rounded-full transition-all cursor-pointer accent-violet-400"
              aria-label="Seek track"
            />
          </div>

          <span className="text-[10px] font-mono text-zinc-400 w-9">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* 3. Volume & Extras (Right) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[220px] max-w-[340px]">
        {/* Audio Visualizer Mini Bars */}
        <div className="hidden xl:block w-18 h-5 mr-1" title="Audio Spectrum">
          <AudioVisualizer barCount={12} />
        </div>

        {/* Queue toggle */}
        <button
          onClick={() => setShowQueueModal(true)}
          className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-colors"
          title="Play Queue (Q)"
          aria-label="Open queue"
        >
          <ListMusic className="w-4 h-4" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-full text-[9px] font-bold shadow-sm">
              {queue.length}
            </span>
          )}
        </button>

        {/* Volume controls */}
        <div className="flex items-center gap-2 group">
          <button
            onClick={toggleMute}
            className="text-zinc-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            aria-label="Toggle mute"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : volume < 50 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <div className="w-20 sm:w-24">
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/[0.08] rounded-full accent-violet-400 cursor-pointer"
              aria-label="Volume slider"
            />
          </div>
        </div>

        {/* Fullscreen Expand */}
        <button
          onClick={() => setShowFullPlayer(true)}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-colors"
          title="Full Player"
          aria-label="Expand player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
