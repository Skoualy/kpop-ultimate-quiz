/**
 * Extracts the 11-character YouTube video ID from any valid YouTube URL.
 * Handles: watch?v=, youtu.be/, embed/, shorts/
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/**
 * Returns the best-quality available thumbnail URL for a YouTube video.
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

/**
 * Builds the YouTube embed URL with all required parameters for Save One.
 * - enablejsapi: enables postMessage API
 * - controls=0: hide YouTube controls
 * - modestbranding: reduce YT branding
 * - rel=0: no related videos
 * - iv_load_policy=3: hide annotations
 */
export function buildEmbedUrl(
  videoId: string,
  startTime: number,
  endTime: number,
  origin: string,
  autoplay = true,
): string {
  const params = new URLSearchParams({
    start: String(Math.floor(startTime)),
    end: String(Math.ceil(endTime)),
    autoplay: autoplay ? '1' : '0',
    controls: '0',
    iv_load_policy: '3',
    disablekb: '1',
    enablejsapi: '1',
    origin,
    playsinline: '1',
    vq: 'hd720',
  })
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}
