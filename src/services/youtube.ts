export interface ExtractedVideoInfo {
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  duration?: number;
}

/**
 * Extracts a 11-character YouTube video ID from various YouTube URL formats or raw ID.
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const trimmed = urlOrId.trim();

  // If already an 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common patterns:
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/shorts/dQw4w9WgXcQ
  // https://music.youtube.com/watch?v=dQw4w9WgXcQ
  // https://www.youtube.com/embed/dQw4w9WgXcQ
  // https://www.youtube.com/live/dQw4w9WgXcQ
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    /youtube\.com\/video\/([\w-]{11})/,
    /music\.youtube\.com\/watch\?v=([\w-]{11})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    }
  }

  // Try URL parser for search params
  try {
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && vParam.length === 11) {
      return vParam;
    }
  } catch {
    // Ignore URL parse errors
  }

  return null;
}

/**
 * Get the best thumbnail URL for a YouTube video ID.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Clean up title string (remove trailing "- YouTube", etc.)
 */
export function cleanVideoTitle(rawTitle: string): string {
  if (!rawTitle) return 'Untitled Track';
  return rawTitle
    .replace(/\s*-\s*YouTube$/i, '')
    .replace(/\s*\(Official (?:Music )?Video\)/i, '')
    .replace(/\s*\[Official (?:Music )?Video\]/i, '')
    .replace(/\s*\(Official Audio\)/i, '')
    .replace(/\s*\[Official Audio\]/i, '')
    .replace(/\s*\(Visualizer\)/i, '')
    .replace(/\s*\(Lyric Video\)/i, '')
    .trim();
}

/**
 * Fetches video metadata safely using YouTube's official oEmbed API and noembed fallback.
 * Strictly avoids scraping and requires no API keys.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<ExtractedVideoInfo> {
  const fallbackInfo: ExtractedVideoInfo = {
    videoId,
    title: `YouTube Track (${videoId})`,
    channel: 'YouTube Artist',
    thumbnailUrl: getYouTubeThumbnail(videoId),
    duration: 0,
  };

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Try YouTube oEmbed first
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      return {
        videoId,
        title: cleanVideoTitle(data.title || fallbackInfo.title),
        channel: data.author_name || 'YouTube Creator',
        thumbnailUrl: data.thumbnail_url || getYouTubeThumbnail(videoId),
        duration: 0,
      };
    }
  } catch {
    // Try fallback to noembed service
    try {
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`;
      const res = await fetch(noembedUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          return {
            videoId,
            title: cleanVideoTitle(data.title),
            channel: data.author_name || 'YouTube Creator',
            thumbnailUrl: data.thumbnail_url || getYouTubeThumbnail(videoId),
            duration: 0,
          };
        }
      }
    } catch {
      // Return safe fallback
    }
  }

  return fallbackInfo;
}

/**
 * Format duration from seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
