import React from 'react';
import { Play, Shuffle, Music, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { Playlist } from '../../types';
import { useLibrary } from '../../context/LibraryContext';
import { usePlayer } from '../../context/PlayerContext';

interface PlaylistCardProps {
  playlist: Playlist;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist }) => {
  const { songs, setActivePage, deletePlaylist, openCreatePlaylistModal } = useLibrary();
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
      className="group relative p-3.5 rounded-3xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-violet-500/40 transition-all duration-200 cursor-pointer select-none backdrop-blur-md hover:shadow-2xl hover:shadow-black/60"
    >
      {/* Cover / Collage */}
      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-zinc-800/80 mb-3 shadow-md flex items-center justify-center border border-white/10">
        {coverImage ? (
          <img
            src={coverImage}
            alt={playlist.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 gap-2">
            <Music className="w-10 h-10 text-violet-400/60" />
            <span className="text-xs">Empty Playlist</span>
          </div>
        )}

        {/* Play overlay button */}
        {playlistSongs.length > 0 && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all flex items-center justify-center">
            <button
              onClick={handlePlayPlaylist}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white flex items-center justify-center shadow-xl shadow-indigo-950/60 transform hover:scale-110 transition-transform border border-white/20"
              title="Play playlist"
            >
              <Play className="w-5 h-5 fill-white translate-x-0.5" />
            </button>
          </div>
        )}

        {/* Badge count */}
        <span className="absolute bottom-2 left-2 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-black/75 text-zinc-200 backdrop-blur-md border border-white/10">
          {playlist.songIds.length} {playlist.songIds.length === 1 ? 'song' : 'songs'}
        </span>
      </div>

      {/* Title & Desc */}
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-violet-300 truncate transition-colors">
          {playlist.name}
        </h3>
        <p className="text-xs text-zinc-400 truncate mt-1">
          {playlist.description || `${playlist.songIds.length} tracks`}
        </p>
      </div>
    </div>
  );
};
