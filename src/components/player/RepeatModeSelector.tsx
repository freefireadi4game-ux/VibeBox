import React, { useState, useRef, useEffect } from 'react';
import { Repeat, Repeat1, Check, RefreshCw } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { RepeatOption, PlaybackMode } from '../../types';

interface RepeatModeSelectorProps {
  variant?: 'compact' | 'full' | 'inline';
}

const REPEAT_COUNT_OPTIONS: { label: string; value: RepeatOption; description: string }[] = [
  { label: 'Off', value: 'off', description: 'Play through queue normally' },
  { label: '1x', value: '1', description: 'Repeat track once, then advance' },
  { label: '2x', value: '2', description: 'Repeat track 2 times, then advance' },
  { label: '3x', value: '3', description: 'Repeat track 3 times, then advance' },
  { label: '5x', value: '5', description: 'Repeat track 5 times, then advance' },
  { label: '10x', value: '10', description: 'Repeat track 10 times, then advance' },
  { label: '20x', value: '20', description: 'Repeat track 20 times, then advance' },
  { label: '∞ Loop', value: 'inf', description: 'Repeat track indefinitely' },
];

export const RepeatModeSelector: React.FC<RepeatModeSelectorProps> = ({ variant = 'compact' }) => {
  const {
    playbackMode,
    repeatCount,
    currentRepeatIteration,
    setPlaybackMode,
    setRepeatCount,
  } = usePlayer();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const isRepeatCountActive = playbackMode === 'repeat-count' && repeatCount !== 'off';
  const isRepeatSongActive = playbackMode === 'repeat-song' || repeatCount === 'inf';
  const isRepeatPlaylistActive = playbackMode === 'repeat-playlist';
  const isAnyRepeatActive = isRepeatCountActive || isRepeatSongActive || isRepeatPlaylistActive;

  // Format the label badge
  let badgeText = '';
  if (isRepeatCountActive) {
    badgeText = `${repeatCount}x`;
  } else if (isRepeatSongActive) {
    badgeText = '1';
  } else if (isRepeatPlaylistActive) {
    badgeText = 'All';
  }

  // Iteration indicator for UI (e.g. "Repeat 2/3")
  const iterationLabel = isRepeatCountActive && (repeatCount as string) !== 'inf'
    ? `(${currentRepeatIteration}/${repeatCount})`
    : '';

  const handleSelectCount = (count: RepeatOption) => {
    setRepeatCount(count);
    setIsOpen(false);
  };

  const handleSelectPlaylistRepeat = () => {
    setPlaybackMode('repeat-playlist');
    setRepeatCount('off');
    setIsOpen(false);
  };

  if (variant === 'full') {
    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all select-none backdrop-blur-md ${
            isAnyRepeatActive
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 shadow-md shadow-violet-950/40'
              : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20'
          }`}
          title="Repeat Settings"
          aria-label="Repeat settings"
        >
          {isRepeatSongActive ? (
            <Repeat1 className="w-4 h-4 text-violet-400" />
          ) : (
            <Repeat className={`w-4 h-4 ${isAnyRepeatActive ? 'text-violet-400' : ''}`} />
          )}

          <span className="text-xs font-semibold">
            {isRepeatPlaylistActive
              ? 'Repeat: Playlist'
              : isRepeatSongActive
              ? 'Repeat: Song (∞)'
              : isRepeatCountActive
              ? `Repeat: ${repeatCount}x ${iterationLabel}`
              : 'Repeat: Off'}
          </span>
        </button>

        {isOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-[#0d1020]/95 border border-white/[0.12] rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 border-b border-white/[0.08] mb-1 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Playback Repeat Mode
              </span>
              {iterationLabel && (
                <span className="text-[11px] font-mono text-violet-400 font-semibold">
                  Playing {iterationLabel}
                </span>
              )}
            </div>

            {/* Playlist Repeat Option */}
            <button
              onClick={handleSelectPlaylistRepeat}
              className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                isRepeatPlaylistActive
                  ? 'bg-violet-500/25 text-violet-200 font-semibold'
                  : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Repeat Playlist</span>
              </div>
              {isRepeatPlaylistActive && <Check className="w-3.5 h-3.5 text-violet-400" />}
            </button>

            <div className="h-px bg-white/[0.08] my-1" />

            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {REPEAT_COUNT_OPTIONS.map((opt) => {
                const isSelected =
                  !isRepeatPlaylistActive &&
                  (opt.value === 'inf' ? isRepeatSongActive : repeatCount === opt.value);

                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectCount(opt.value)}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-violet-500/25 text-violet-200 font-semibold'
                        : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">{opt.description}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact icon button for Desktop & Mobile players
  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-all relative select-none ${
          isAnyRepeatActive
            ? 'text-violet-300 bg-violet-500/20 border border-violet-500/35 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
        }`}
        title={
          isRepeatPlaylistActive
            ? 'Repeat Playlist'
            : isRepeatSongActive
            ? 'Repeat Song (Indefinite)'
            : isRepeatCountActive
            ? `Repeat Song: ${repeatCount}x ${iterationLabel}`
            : 'Repeat: Off (Click to configure)'
        }
        aria-label="Repeat settings"
      >
        {isRepeatSongActive ? (
          <Repeat1 className="w-4 h-4" />
        ) : (
          <Repeat className="w-4 h-4" />
        )}

        {isAnyRepeatActive && badgeText && (
          <span className="absolute -top-1 -right-1 px-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold rounded-full text-[8px] leading-tight shadow-sm">
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-56 bg-[#0d1020]/95 border border-white/[0.12] rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-white/[0.08] mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Repeat Mode
            </span>
            {iterationLabel && (
              <span className="text-[10px] font-mono text-violet-400 font-semibold">
                {iterationLabel}
              </span>
            )}
          </div>

          <button
            onClick={handleSelectPlaylistRepeat}
            className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
              isRepeatPlaylistActive
                ? 'bg-violet-500/25 text-violet-200 font-semibold'
                : 'text-zinc-200 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Repeat Playlist</span>
            </div>
            {isRepeatPlaylistActive && <Check className="w-3.5 h-3.5 text-violet-400" />}
          </button>

          <div className="h-px bg-white/[0.08] my-1" />

          <div className="space-y-0.5 max-h-52 overflow-y-auto">
            {REPEAT_COUNT_OPTIONS.map((opt) => {
              const isSelected =
                !isRepeatPlaylistActive &&
                (opt.value === 'inf' ? isRepeatSongActive : repeatCount === opt.value);

              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelectCount(opt.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-violet-500/25 text-violet-200 font-semibold'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-violet-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
