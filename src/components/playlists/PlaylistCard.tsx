import React from 'react';
import { Play, Music } from 'lucide-react';
import { Playlist } from '../../types';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const { songs, setActivePage } = useLibrary();
  const { playSong } = usePlayer();

  const playlistSongs = songs.filter((s) => playlist.songIds.includes(s.id));
  const coverImage = playlist.coverUrl || playlistSongs[0]?.thumbnailUrl;

  const handlePlayPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs, 0);
    }
  };

  return (
    <div
      onClick={() => setActivePage('playlist-detail', playlist.id)}
      className="group relative p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-violet-500/35 transition-all duration-200 cursor-pointer select-none backdrop-blur-md hover:shadow-2xl hover:shadow-black/70"
    >
      {/* Cover / Collage */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-900 mb-2.5 shadow-md flex items-center justify-center border border-white/10">
        {coverImage ? (
          <img
            src={coverImage}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 gap-1.5">
            <Music className="w-8 h-8 text-violet-400/50" />
            <span className="text-[11px] text-zinc-500">Empty</span>
          </div>
        )}

        {/* Play overlay button */}
        {playlistSongs.length > 0 && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all flex items-center justify-center">
            <button
              onClick={handlePlayPlaylist}
              className="w-11 h-11 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white flex items-center justify-center shadow-xl shadow-indigo-950/70 transform hover:scale-105 transition-transform border border-white/20"
              title="Play playlist"
            >
              <Play className="w-4 h-4 fill-white translate-x-0.5" />
            </button>
          </div>
        )}

        {/* Badge count */}
        <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-black/80 text-zinc-300 backdrop-blur-md border border-white/10">
          {playlist.songIds.length} {playlist.songIds.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>

      {/* Title & Desc */}
      <div className="min-w-0 px-0.5">
        <h3 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-violet-300 truncate transition-colors tracking-tight">
          {playlist.name}
        </h3>
        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
          {playlist.description || `${playlist.songIds.length} tracks`}
        </p>
      </div>
    </div>
  );
};
