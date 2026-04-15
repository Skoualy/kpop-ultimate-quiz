import styles from './IdolCard.module.scss'
import type { IdolCardProps } from './IdolCard.types'

const PLACEHOLDER_F = '/assets/placeholders/idol-female.webp'
const PLACEHOLDER_M = '/assets/placeholders/idol-male.webp'

export function IdolCard({ idol, size, disabled, onClick }: IdolCardProps) {
  const portrait = idol.portrait ?? PLACEHOLDER_F

  const handleClick = () => { if (!disabled) onClick(idol.idolId) }

  return (
    <button
      type="button"
      className={[styles.card, styles[size], disabled ? styles.disabled : ''].join(' ')}
      onClick={handleClick}
      disabled={disabled}
    >
      {/* Portrait — padding visible autour de l'image */}
      <div className={styles.portraitPad}>
        <div className={styles.portraitWrap}>
          <img
            src={portrait}
            alt={idol.name}
            className={styles.portrait}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = PLACEHOLDER_F
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <p className={styles.name}>{idol.name}</p>
        <p className={styles.group}>{idol.groupName}</p>
        {/* Badge ancien membre — SOUS le portrait, pas en overlay */}
        {idol.isFormer && (
          <span className={styles.formerBadge}>⚠ Ancien membre</span>
        )}
      </div>
    </button>
  )
}
