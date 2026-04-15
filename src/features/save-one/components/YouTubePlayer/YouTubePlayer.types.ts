export interface YouTubePlayerHandle {
  /** Seek to startTime and resume playing */
  replay: () => void
}

export interface YouTubePlayerProps {
  videoId: string
  startTime: number
  endTime: number
  /** Called once when the video actually starts playing (YT state = 1) */
  onPlay?: () => void
  /** Called when the clip reaches endTime (YT state = 0 / ended) */
  onClipEnd?: () => void
  /** Called on any YouTube player error */
  onError?: () => void
  className?: string
}
