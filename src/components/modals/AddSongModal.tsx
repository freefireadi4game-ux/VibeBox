import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Link,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Music,
  Heart,
  Plus,
  Play,
  Sparkles,
  ClipboardPaste,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';
import { extractYouTubeId, fetchYouTubeMetadata } from '../../services/youtube';

export const AddSongModal: React.FC = () => {
  const { isAddSongOpen, closeAddSongModal, addSong, playlists, addToast } = useLibrary();
  const { playSong } = usePlayer();

  const [inputUrl, setInputUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [extractedId, setExtractedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset fields when modal opens
  useEffect(() => {
    if (isAddSongOpen) {
      setInputUrl('');
      setExtractedId(null);
      setTitle('');
      setChannel('');
      setThumbnailUrl('');
      setSelectedPlaylistId('');
      setIsFavorite(false);
      setError(null);
    }
  }, [isAddSongOpen]);

  // Handle URL change & live validation
  const handleUrlChange = (value: string) => {
    setInputUrl(value);
    setError(null);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setExtractedId(null);
      return;
    }

    const videoId = extractYouTubeId(trimmed);
    if (!videoId) {
      setError('Please enter a valid YouTube video or Shorts link (e.g. youtube.com/watch?v=...)');
      setExtractedId(null);
      return;
    }

    setExtractedId(videoId);
    setIsValidating(true);

    // Debounce metadata fetch
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const metadata = await fetchYouTubeMetadata(videoId);
        setTitle(metadata.title);
        setChannel(metadata.channel);
        setThumbnailUrl(metadata.thumbnailUrl);
        setError(null);
      } catch (err) {
        // Safe fallback
        setTitle(`YouTube Track (${videoId})`);
        setChannel('YouTube Artist');
        setThumbnailUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
      } finally {
        setIsValidating(false);
      }
    }, 400);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleUrlChange(text);
      }
    } catch {
      addToast('Clipboard access denied', 'Please paste the URL directly into the input field.', 'info');
    }
  };

  const handleSave = (andPlay: boolean = false) => {
    if (!extractedId) {
      setError('Valid YouTube video is required.');
      return;
    }

    const savedSong = addSong(
      {
        youtubeId: extractedId,
        title: title.trim() || 'Untitled Track',
        channel: channel.trim() || 'YouTube Artist',
        thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`,
        duration: 0,
        isFavorite,
      },
      selectedPlaylistId || undefined
    );

    if (andPlay) {
      playSong(savedSong);
    }

    closeAddSongModal();
  };

  if (!isAddSongOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          onClick={closeAddSongModal}
        />

        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#0e1224]/95 border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 z-10 overflow-hidden max-h-[90vh] flex flex-col backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/25">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Add YouTube Song</h2>
                <p className="text-xs text-zinc-400">Add any song, lofi beat, live set, or track to your library</p>
              </div>
            </div>
            <button
              onClick={closeAddSongModal}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
            {/* Input URL group */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                YouTube URL or Shorts Link
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-zinc-500">
                  <Link className="w-4 h-4" />
                </div>
                <input
                  id="add-song-url-input"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                  value={inputUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-10 pr-24 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500/80 focus:ring-1 focus:ring-violet-500/40 transition-all font-mono backdrop-blur-md"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 text-xs flex items-center gap-1.5 transition-colors border border-white/[0.06]"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>

              {/* Status or error */}
              {isValidating && (
                <div className="flex items-center gap-2 mt-2 text-xs text-violet-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching video details safely...</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 mt-2 text-xs text-rose-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Preview Card */}
            {extractedId && !isValidating && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white/[0.03] border border-violet-500/30 space-y-4 shadow-xl shadow-violet-950/20 backdrop-blur-xl"
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-xl overflow-hidden shrink-0 bg-black/60 border border-white/10">
                    <img
                      src={thumbnailUrl || `https://i.ytimg.com/vi/${extractedId}/hqdefault.jpg`}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1 py-0.2 text-[9px] font-mono bg-black/80 rounded text-violet-300">
                      VALID
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Title (Editable)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-[#0a0c18] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-medium focus:outline-none focus:border-violet-500"
                        placeholder="Song Title"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Channel / Artist (Editable)
                      </label>
                      <input
                        type="text"
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className="w-full bg-[#0a0c18] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
                        placeholder="Channel or Artist"
                      />
                    </div>
                  </div>
                </div>

                {/* Playlist and Favorite options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.08]">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                      Add to Playlist (Optional)
                    </label>
                    <select
                      value={selectedPlaylistId}
                      onChange={(e) => setSelectedPlaylistId(e.target.value)}
                      className="w-full bg-[#0a0c18] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-violet-500"
                    >
                      <option value="">None (Library Only)</option>
                      {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                        isFavorite
                          ? 'bg-violet-950/60 border-violet-500/50 text-violet-300'
                          : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-violet-400 text-violet-400' : ''}`} />
                      <span>{isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Helpful quick tips */}
            {!extractedId && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-2 backdrop-blur-md">
                <div className="flex items-center gap-2 text-violet-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tip: Supports Any YouTube Format</span>
                </div>
                <p className="leading-relaxed">
                  Paste standard YouTube videos, music tracks, lofi streams, live concerts, or Shorts.
                  Playback runs directly through the official YouTube IFrame Player with zero audio scraping or conversion.
                </p>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
            <button
              onClick={closeAddSongModal}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!extractedId || isValidating}
              onClick={() => handleSave(false)}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white disabled:opacity-40 disabled:pointer-events-none transition-all border border-white/10"
            >
              Save to Library
            </button>
            <button
              disabled={!extractedId || isValidating}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-950/50 disabled:opacity-40 disabled:pointer-events-none transition-all border border-white/15"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Save & Play</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
