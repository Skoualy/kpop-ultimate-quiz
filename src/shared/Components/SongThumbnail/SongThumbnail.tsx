import styles from './SongThumbnail.module.scss'
import type { SongThumbnailProps } from './SongThumbnail.types'

export function SongThumbnail({
  song,
  revealed,
  replayEnabled,
  isPlaying = false,
  isSequencePlaying = false,
  disabled,
  onChoose,
  onReplay,
  onSkip,
}: SongThumbnailProps) {
  const handleChoose = () => {
    if (!disabled && revealed && onChoose) onChoose(song.songId)
  }

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (replayEnabled) onReplay(song)
  }

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isPlaying && onSkip) onSkip()
  }

  /*
   * Logique du bouton d'action en bas de la card :
   *
   *  Séquence en cours (isSequencePlaying) :
   *    → Card en lecture (isPlaying) : "⏭ Passer" ACTIVÉ
   *    → Autres cards               : "⏭ Passer" DÉSACTIVÉ (grisé)
   *
   *  Séquence terminée (!isSequencePlaying) && non choisie (!disabled) :
   *    → "↺ Rejouer" ACTIVÉ si replayEnabled
   *    → "↺ Rejouer" DÉSACTIVÉ si !replayEnabled
   *
   *  Card choisie (disabled) : pas de bouton
   */
  const showSkip = isSequencePlaying
  const showReplay = !isSequencePlaying && !disabled
  const skipEnabled = isPlaying && !!onSkip

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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleChoose()
      }}
    >
      {/* Thumbnail */}
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
        {isPlaying && <div className={styles.playingRing} />}
      </div>

      {/* Texte */}
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

      {/* Bouton d'action — hauteur toujours réservée */}
      <div className={styles.actionWrap}>
        {showSkip && (
          <button
            type="button"
            className={[styles.actionBtn, styles.skipBtn, !skipEnabled ? styles.actionDisabled : ''].join(' ')}
            onClick={handleSkip}
            disabled={!skipEnabled}
            aria-label="Passer cet extrait"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4l12 8-12 8V4z" />
              <rect x="18" y="4" width="3" height="16" rx="1" />
            </svg>
            Passer
          </button>
        )}
        {showReplay && (
          <button
            type="button"
            className={[styles.actionBtn, styles.replayBtn, !replayEnabled ? styles.actionDisabled : ''].join(' ')}
            onClick={handleReplay}
            disabled={!replayEnabled}
            aria-label={`Rejouer ${song.title}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3.51 15a9 9 0 1 0 .49-5.17L1 10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Rejouer
          </button>
        )}
      </div>
    </div>
  )
}
