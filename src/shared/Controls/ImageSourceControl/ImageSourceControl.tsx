import { useState } from 'react'
import type { ImageCreditInput, ImageSourceType } from '@/shared/models/AssetCredit'
import styles from './ImageSourceControl.module.scss'

const URL_REGEX = /^https?:\/\/.{3,}/

interface ImageSourceControlProps {
  value: ImageCreditInput
  onChange: (credit: ImageCreditInput) => void
  disabled?: boolean
}

// Seulement deux badges — 'unknown' est implicite (source non renseignée)
const SOURCE_OPTIONS: { value: ImageSourceType; label: string; icon: string }[] = [
  { value: 'wikimedia', label: 'Wikimedia Commons', icon: '🌐' },
  { value: 'other',     label: 'Autre',              icon: '🔗' },
]

export function ImageSourceControl({ value, onChange, disabled }: ImageSourceControlProps) {
  const [urlError, setUrlError] = useState(false)

  const isWikimedia = value.sourceType === 'wikimedia'
  const isOther     = value.sourceType === 'other'

  function setSourceType(sourceType: ImageSourceType) {
    // Conserver originalFileName et les autres champs au changement de badge
    onChange({
      ...value,
      sourceType,
      sourceUrl: sourceType === 'other' ? (value.sourceUrl ?? null) : null,
    })
    setUrlError(false)
  }

  function setOriginalFileName(v: string) {
    onChange({ ...value, originalFileName: v || null })
  }

  function setSourceUrl(url: string) {
    const trimmed = url.trim()
    // Erreur seulement si quelque chose est saisi ET invalide
    setUrlError(trimmed.length > 0 && !URL_REGEX.test(trimmed))
    onChange({ ...value, sourceUrl: trimmed || null })
  }

  function setAiModified(aiModified: boolean) {
    onChange({ ...value, aiModified })
  }

  return (
    <div className={[styles.root, disabled ? styles.disabled : ''].join(' ')}>
      <p className={styles.title}>Source de l'image</p>

      {/* Deux badges : Wikimedia / Autre */}
      <div className={styles.sourceOptions}>
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[
              styles.sourceOption,
              value.sourceType === opt.value ? styles.sourceOptionActive : '',
              styles[`opt_${opt.value}`],
            ].join(' ')}
            onClick={() => !disabled && setSourceType(opt.value)}
            disabled={disabled}
          >
            <span className={styles.optIcon}>{opt.icon}</span>
            <span className={styles.optLabel}>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Champ nom de fichier Wikimedia */}
      {isWikimedia && (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            Nom de fichier Commons <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            className={['input', styles.monoInput].join(' ')}
            placeholder="Ex: File:Jihyo_TWICE_2019.jpg"
            value={value.originalFileName ?? ''}
            onChange={(e) => setOriginalFileName(e.target.value)}
            disabled={disabled}
          />
          <p className={styles.fieldHint}>
            Copie exacte du nom affiché sur{' '}
            <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" className={styles.link}>
              commons.wikimedia.org
            </a>
          </p>
        </div>
      )}

      {/* URL optionnelle pour "Autre" — si vide = source inconnue */}
      {isOther && (
        <div className={styles.field}>
          <label className={styles.fieldLabel}>URL de la source</label>
          <input
            type="url"
            className={['input', urlError ? styles.inputError : ''].join(' ')}
            placeholder="https://example.com/… (optionnel)"
            value={value.sourceUrl ?? ''}
            onChange={(e) => setSourceUrl(e.target.value)}
            disabled={disabled}
          />
          {urlError && (
            <p className={styles.errorMsg}>URL invalide — doit commencer par http:// ou https://</p>
          )}
          <p className={styles.fieldHint}>Laissez vide si la source n'est pas connue.</p>
        </div>
      )}

      {/* Case IA */}
      <label className={[styles.checkboxRow, disabled ? styles.checkboxDisabled : ''].join(' ')}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={value.aiModified ?? false}
          onChange={(e) => !disabled && setAiModified(e.target.checked)}
          disabled={disabled}
        />
        <span className={styles.checkboxLabel}>Image générée ou retouchée par IA</span>
      </label>
    </div>
  )
}
