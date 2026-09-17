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
  Sparkles,
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

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
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
      className="hidden md:flex fixed bottom-0 left-0 right-0 h-24 bg-[#080a14]/85 border-t border-white/[0.08] backdrop-blur-3xl px-6 items-center justify-between z-40 shadow-[0_-10px_35px_rgba(0,0,0,0.5)] select-none"
    >
      {/* 1. Track Info (Left) */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[220px] max-w-[340px]">
        <div
          onClick={() => setShowFullPlayer(true)}
          className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 group cursor-pointer bg-zinc-900 border border-white/15 shadow-lg shadow-black/60"
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
              className="text-sm font-semibold text-zinc-100 hover:text-violet-300 truncate cursor-pointer transition-colors"
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
          <p className="text-xs text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
            <span>{currentSong.channel}</span>
            <span className="text-[10px] text-zinc-500 font-mono">• HD</span>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => toggleFavorite(currentSong.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              currentSong.isFavorite
                ? 'text-violet-400 hover:text-violet-300'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={currentSong.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-label="Toggle favorite"
          >
            <Heart className={`w-4 h-4 ${currentSong.isFavorite ? 'fill-violet-400' : ''}`} />
          </button>

          {/* Toggle Video Dock */}
          <button
            onClick={() => setIsVideoVisible(!isVideoVisible)}
            className={`p-1.5 rounded-lg transition-colors ${
              isVideoVisible
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
            }`}
            title={isVideoVisible ? 'Hide Official Video Window (V)' : 'Watch Official YouTube Video (V)'}
            aria-label="Toggle YouTube video"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Controls & Progress Bar (Center) */}
      <div className="flex flex-col items-center gap-2 w-2/4 max-w-2xl px-4">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleShuffle}
            className={`p-2 rounded-xl transition-all relative ${
              isShuffleActive
                ? 'text-violet-300 bg-violet-500/20 border border-violet-500/35 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
            }`}
            title={`Shuffle: ${isShuffleActive ? 'On (Avoids repeats)' : 'Off'} (S)`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={prevSong}
            className="p-1.5 text-zinc-300 hover:text-white transition-transform hover:scale-110 active:scale-95"
            title="Previous / restart (P)"
            aria-label="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white shadow-lg shadow-indigo-950/70 border border-white/20 transform hover:scale-105 active:scale-95 transition-all"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-white" />
            ) : (
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            )}
          </button>

          <button
            onClick={nextSong}
            className="p-1.5 text-zinc-300 hover:text-white transition-transform hover:scale-110 active:scale-95"
            title="Next Track (N)"
            aria-label="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
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
          <span className="text-[11px] font-mono text-zinc-400 w-10 text-right">
            {formatDuration(currentTime)}
          </span>

          <div className="relative flex-1 flex items-center group cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1 bg-white/[0.1] group-hover:h-1.5 rounded-full transition-all cursor-pointer accent-violet-400"
              aria-label="Seek track"
            />
          </div>

          <span className="text-[11px] font-mono text-zinc-400 w-10">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* 3. Volume & Extras (Right) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[220px] max-w-[340px]">
        {/* Audio Visualizer Mini Bars */}
        <div className="hidden xl:block w-20 h-6 mr-1" title="Audio Spectrum">
          <AudioVisualizer barCount={14} />
        </div>

        {/* Queue toggle */}
        <button
          onClick={() => setShowQueueModal(true)}
          className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-colors"
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
              className="w-full h-1 bg-white/[0.1] rounded-full accent-violet-400 cursor-pointer"
              aria-label="Volume slider"
            />
          </div>
        </div>

        {/* Fullscreen Expand */}
        <button
          onClick={() => setShowFullPlayer(true)}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-colors"
          title="Full Player"
          aria-label="Expand player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
