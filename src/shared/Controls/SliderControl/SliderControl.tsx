import type { SliderControlProps } from './SliderControl.types'
import styles from './SliderControl.module.scss'

/**
 * SliderControl — contrôle générique pour les valeurs numériques bornées.
 *
 * Affiche : valeur courante | barre de progression | min et max
 * Si clampedMax est fourni : le max effectif est clampedMax, un badge d'avertissement
 * est affiché et toute interaction notifie onClampReset pour que le parent puisse
 * réinitialiser le bridage dès que la config change à nouveau.
 */
export function SliderControl({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  clampedMax,
  onClampReset,
}: SliderControlProps) {
  const effectiveMax = clampedMax !== undefined ? clampedMax : max
  const isClamped    = clampedMax !== undefined && clampedMax < max

  // S'assurer que value reste dans les bornes effectives
  const clampedValue = Math.max(min, Math.min(effectiveMax, value))

  // Pourcentage de remplissage de la barre
  const fillPct = effectiveMax > min
    ? ((clampedValue - min) / (effectiveMax - min)) * 100
    : 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseInt(e.target.value, 10)
    if (!isNaN(next)) {
      onChange(Math.max(min, Math.min(effectiveMax, next)))
      // Toute interaction reset le clamp (l'utilisateur reprend la main)
      onClampReset?.()
    }
  }

  return (
    <div className={[styles.root, disabled ? styles.disabled : ''].join(' ')}>
      {/* Valeur courante + badge bridage */}
      <div className={styles.valueRow}>
        <span className={styles.currentValue}>{clampedValue}</span>
        {isClamped && (
          <span className={styles.clampBadge} title={`Maximum ajusté à ${clampedMax} par la validation`}>
            bridé à {clampedMax} ⚠️
          </span>
        )}
      </div>

      {/* Slider avec barre de remplissage */}
      <div className={styles.trackWrapper}>
        <div
          className={styles.fill}
          style={{ width: `${fillPct}%` }}
        />
        <input
          type="range"
          className={styles.input}
          min={min}
          max={effectiveMax}
          step={step}
          value={clampedValue}
          disabled={disabled}
          onChange={handleChange}
        />
      </div>

      {/* Min / Max */}
      <div className={styles.bounds}>
        <span className={styles.bound}>{min}</span>
        <span className={styles.bound}>{effectiveMax}{isClamped ? ` / ${max}` : ''}</span>
      </div>
    </div>
  )
}
