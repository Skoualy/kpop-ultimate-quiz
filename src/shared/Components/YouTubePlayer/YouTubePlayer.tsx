import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react'
import { buildEmbedUrl } from '../../../features/save-one/helpers/youtubeHelpers'
import type { YouTubePlayerHandle, YouTubePlayerProps } from './YouTubePlayer.types'
import styles from './YouTubePlayer.module.scss'

// YouTube IFrame player states
const YT_PLAYING = 1
const YT_ENDED = 0

/**
 * Thin wrapper around the YouTube IFrame Player API (postMessage).
 *
 * Strategy:
 * - Embed URL includes `start`, `end`, `autoplay=1`, `controls=0`, `enablejsapi=1`
 * - Listen to `window.message` for `onStateChange` and `onError` from YT
 * - Use `playerapiid` to disambiguate events when multiple iframes exist
 * - Expose `replay()` via ref (seeks to startTime and replays)
 *
 * Masquage du player-control-overlay YouTube :
 * - `controls=0` dans l'URL masque la barre de progression mais pas l'overlay
 * - L'overlay (.overlay) intercepte tous les événements de pointeur avant qu'ils
 *   n'atteignent l'iframe → YouTube ne reçoit jamais les hover/click → l'overlay
 *   de contrôle ne s'affiche jamais. Injection CSS cross-origin impossible (SOP).
 */
export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  { videoId, startTime, endTime, onPlay, onClipEnd, onError, autoplay = true, className },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Unique ID to disambiguate postMessage events from multiple players
  const playerId = useId().replace(/:/g, '_')

  const onPlayRef = useRef(onPlay)
  const onClipEndRef = useRef(onClipEnd)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onPlayRef.current = onPlay
  }, [onPlay])
  useEffect(() => {
    onClipEndRef.current = onClipEnd
  }, [onClipEnd])
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Track whether onPlay has already been called for this clip
  const playFiredRef = useRef(false)

  // postMessage command helper
  const sendCommand = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
  }

  // Listen for YT postMessage events
  useEffect(() => {
    playFiredRef.current = false

    const handler = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return

      let data: { event?: string; info?: unknown; id?: string }
      try {
        data = JSON.parse(event.data as string)
      } catch {
        return
      }

      // Filter by playerapiid when provided
      if (data.id && data.id !== playerId) return

      if (data.event === 'onStateChange') {
        const state = data.info as number
        if (state === YT_PLAYING && !playFiredRef.current) {
          playFiredRef.current = true
          onPlayRef.current?.()
        }
        if (state === YT_ENDED) {
          onClipEndRef.current?.()
        }
      }

      if (data.event === 'onError') {
        onErrorRef.current?.()
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [videoId, startTime, playerId])

  // Imperative API: replay
  useImperativeHandle(ref, () => ({
    replay: () => {
      playFiredRef.current = false
      sendCommand('seekTo', [startTime, true])
      sendCommand('playVideo')
    },
  }))

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const src = buildEmbedUrl(videoId, startTime, endTime, origin, autoplay) + `&playerapiid=${playerId}`

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      <iframe
        ref={iframeRef}
        key={`${videoId}-${startTime}`}
        src={src}
        title="YouTube player"
        className={styles.iframe}
        allow="autoplay; encrypted-media"
        allowFullScreen={false}
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
      {/*
        Overlay transparent positionné au-dessus de l'iframe.
        pointer-events: auto → capture tous les hover/click avant qu'ils
        n'atteignent l'iframe → player-control-overlay YouTube ne se déclenche jamais.
        L'autoplay fonctionne toujours via le paramètre URL, pas via click.
      */}
      <div className={styles.overlay} aria-hidden />
    </div>
  )
})
