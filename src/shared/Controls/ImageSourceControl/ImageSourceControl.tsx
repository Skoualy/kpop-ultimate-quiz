import type { ImageCreditInput, ImageSourceType, ImageTransformReport } from '@/shared/models/AssetCredit'
import styles from './ImageSourceControl.module.scss'

interface ImageSourceControlProps {
  value: ImageCreditInput
  onChange: (credit: ImageCreditInput) => void
  /** Rapport de transformation produit automatiquement par ImagePickerControl */
  transformReport?: ImageTransformReport | null
  disabled?: boolean
}

const SOURCE_OPTIONS: { value: ImageSourceType; label: string; description: string }[] = [
  {
    value: 'wikimedia',
    label: 'Wikimedia Commons',
    description: 'Image libre trouvée sur commons.wikimedia.org',
  },
  {
    value: 'official',
    label: 'Source officielle',
    description: 'Press kit, agence, compte officiel',
  },
  {
    value: 'unknown',
    label: 'Inconnue',
    description: 'Source non identifiée (non recommandé)',
  },
]

export function ImageSourceControl({ value, onChange, transformReport, disabled }: ImageSourceControlProps) {
  const isWikimedia = value.sourceType === 'wikimedia'

  function setSourceType(sourceType: ImageSourceType) {
    onChange({
      ...value,
      sourceType,
      // Conserver le transformReport courant s'il existe
      transformReport: transformReport ?? value.transformReport,
      // Vider le nom de fichier si on passe hors wikimedia
      originalFileName: sourceType === 'wikimedia' ? value.originalFileName : null,
    })
  }

  function setOriginalFileName(originalFileName: string) {
    onChange({
      ...value,
      originalFileName: originalFileName.trim() || null,
    })
  }

  return (
    <div className={[styles.root, disabled ? styles.disabled : ''].join(' ')}>
      <p className={styles.title}>Source de l'image</p>

      {/* Sélection du type de source */}
      <div className={styles.sourceOptions}>
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              styles.sourceOption,
              value.sourceType === opt.value ? styles.sourceOptionActive : '',
              opt.value === 'wikimedia' ? styles.optWikimedia :
              opt.value === 'official' ? styles.optOfficial : styles.optUnknown,
            ].join(' ')}
            onClick={() => !disabled && setSourceType(opt.value)}
            disabled={disabled}
            title={opt.description}
          >
            <span className={styles.optIcon}>
              {opt.value === 'wikimedia' ? '🌐' : opt.value === 'official' ? '🏢' : '❓'}
            </span>
            <span className={styles.optLabel}>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Champ nom de fichier Commons — uniquement pour wikimedia */}
      {isWikimedia && (
        <div className={styles.filenameField}>
          <label className={styles.filenameLabel}>
            Nom de fichier Commons
            <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            className={['input', styles.filenameInput].join(' ')}
            placeholder="Ex: File:Jihyo_TWICE_2019.jpg"
            value={value.originalFileName ?? ''}
            onChange={(e) => setOriginalFileName(e.target.value)}
            disabled={disabled}
          />
          <p className={styles.filenameHint}>
            Copie exacte du nom de fichier tel qu'affiché sur{' '}
            <a
              href="https://commons.wikimedia.org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              commons.wikimedia.org
            </a>
            . Ce nom sera utilisé pour récupérer automatiquement les infos de licence.
          </p>
        </div>
      )}

      {/* Rapport de transformation (lecture seule, affiché si disponible) */}
      {transformReport && (
        <details className={styles.transformDetails}>
          <summary className={styles.transformSummary}>Transformations appliquées</summary>
          <ul className={styles.transformList}>
            {transformReport.wasCropped && <li>Recadrage</li>}
            {transformReport.wasResized && (
              <li>
                Redimensionnement : {transformReport.originalWidth}×{transformReport.originalHeight} →{' '}
                {transformReport.finalWidth}×{transformReport.finalHeight}
              </li>
            )}
            {transformReport.wasConvertedToWebp && (
              <li>
                Conversion : {transformReport.originalMimeType} → image/webp
              </li>
            )}
            <li>Fichier original : {transformReport.originalFileName}</li>
          </ul>
        </details>
      )}

      {/* Avertissement source inconnue */}
      {value.sourceType === 'unknown' && (
        <p className={styles.unknownWarn}>
          ⚠️ Les images de source inconnue ne sont pas validées pour la publication.
        </p>
      )}
    </div>
  )
}
