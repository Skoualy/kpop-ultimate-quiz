import styles from './SongThumbnail.module.scss'
import type { SongThumbnailProps } from './SongThumbnail.types'

export function SongThumbnail({
  song,
  revealed,
  replayEnabled,
  isPlaying,
  disabled,
  onChoose,
  onReplay,
}: SongThumbnailProps) {
  const handleChoose = () => {
    if (!disabled && revealed) onChoose(song.songId)
  }

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (replayEnabled) onReplay(song)
  }

  return (
    <div
      className={[
        styles.card,
        revealed ? styles.revealed : styles.hidden,
        isPlaying ? styles.playing : '',
        !disabled && revealed ? styles.clickable : '',
      ].join(' ')}
      onClick={handleChoose}
      role={!disabled && revealed ? 'button' : undefined}
      tabIndex={!disabled && revealed ? 0 : -1}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleChoose() }}
    >
      {/* Thumbnail image area */}
      <div className={styles.imageWrap}>
        {revealed ? (
          <img
            src={song.thumbnailUrl}
            alt={song.title}
            className={styles.image}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.opacity = '0'
            }}
            draggable={false}
          />
        ) : (
          <div className={styles.placeholder}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && <div className={styles.playingRing} />}
      </div>

      {/* Text info — always reserve space even when hidden */}
      <div className={styles.info}>
        {revealed ? (
          <>
            <p className={styles.title}>{song.title}</p>
            <p className={styles.group}>{song.groupName}</p>
          </>
        ) : (
          <>
            <p className={styles.titleHidden}>· · ·</p>
            <p className={styles.groupHidden}>&nbsp;</p>
          </>
        )}
      </div>

      {/* Replay button — always occupies same space */}
      <div className={styles.replayWrap}>
        <button
          type="button"
          className={[styles.replay, !replayEnabled ? styles.replayDisabled : ''].join(' ')}
          onClick={handleReplay}
          disabled={!replayEnabled}
          aria-label={`Rejouer ${song.title}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.51 15a9 9 0 1 0 .49-5.17L1 10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Rejouer
        </button>
      </div>
    </div>
  )
}
