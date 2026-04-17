import { useRef, useState } from 'react'
import { ImageCropModal } from './ImageCropModal'
import type { ImagePickerControlProps } from './ImagePickerControl.types'
import type { ImageCreditInput, ImageTransformReport } from '@/shared/models/AssetCredit'
import styles from './ImagePickerControl.module.scss'

export function ImagePickerControl({
  value,
  placeholderImage,
  onChange,
  onFileChange,
  onTransformReport,
  onCreditChange,
  label,
  hint,
  aspectRatio = '1/1',
  disabled = false,
  outputWidth,
  outputHeight,
}: ImagePickerControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState<string | undefined>(undefined)

  // Capture des métadonnées du fichier original
  const originalFileRef = useRef<{
    name: string
    mimeType: string
    width: number | null
    height: number | null
  } | null>(null)

  const outW = outputWidth ?? (aspectRatio === '400/533' ? 400 : 600)
  const outH = outputHeight ?? (aspectRatio === '400/533' ? 533 : 600)
  const cropAspect = outW / outH

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        originalFileRef.current = {
          name: file.name,
          mimeType: file.type,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }
      }
      img.src = dataUrl
      setCropFileName(file.name)
      setCropSrc(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleClear(e: React.MouseEvent) {
    if (disabled) return
    e.stopPropagation()
    onChange('')
    onFileChange?.(null)
    originalFileRef.current = null
    if (inputRef.current) inputRef.current.value = ''
  }

  // Le modal retourne maintenant aussi le credit déclaré par l'utilisateur
  function handleCropConfirm(dataUrl: string, blob: Blob, creditFromModal: ImageCreditInput) {
    onChange(dataUrl)
    const file = new File([blob], 'image.webp', { type: 'image/webp' })
    onFileChange?.(file)

    // Construire le rapport de transformation à partir des métadonnées capturées
    const orig = originalFileRef.current
    const report: ImageTransformReport | null = orig
      ? {
          originalFileName:     orig.name,
          originalMimeType:     orig.mimeType,
          originalWidth:        orig.width,
          originalHeight:       orig.height,
          finalMimeType:        'image/webp',
          finalWidth:           outW,
          finalHeight:          outH,
          wasCropped:           true,
          wasResized:           orig.width !== outW || orig.height !== outH,
          wasConvertedToWebp:   orig.mimeType !== 'image/webp',
        }
      : null

    // Émettre le rapport de transformation seul (rétrocompatibilité)
    if (onTransformReport && report) {
      onTransformReport(report)
    }

    // Émettre le credit complet : infos déclarées par l'utilisateur + transformReport fusionné
    if (onCreditChange) {
      onCreditChange({ ...creditFromModal, transformReport: report })
    }

    setCropSrc(null)
  }

  return (
    <>
      <div className={styles.wrapper}>
        {label && <span className={styles.label}>{label}</span>}

        <div
          className={[styles.picker, disabled ? styles.pickerDisabled : ''].filter(Boolean).join(' ')}
          style={{ aspectRatio }}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {value ? (
            <>
              <img
                src={value}
                alt="preview"
                className={styles.preview}
                onError={(event) => {
                  event.currentTarget.onerror = null
                  event.currentTarget.src = placeholderImage ?? ''
                }}
              />
              {!disabled && <div className={styles.hoverOverlay}>✎ Changer</div>}
              {!disabled && (
                <button className={styles.clearBtn} onClick={handleClear} title="Supprimer">
                  ✕
                </button>
              )}
            </>
          ) : (
            <>
              <img src={placeholderImage} alt="placeholder" className={styles.preview} />
              {!disabled && <div className={styles.hoverOverlay}>✎ Changer</div>}
            </>
          )}
        </div>

        {hint && <span className={styles.hint}>{hint}</span>}

        <input
          ref={inputRef}
          type="file"
          accept="image/webp,image/jpeg,image/jpg,image/png"
          className={styles.fileInput}
          onChange={handleFile}
          disabled={disabled}
        />
      </div>

      {cropSrc && !disabled && (
        <ImageCropModal
          src={cropSrc}
          cropAspect={cropAspect}
          outputWidth={outW}
          outputHeight={outH}
          originalFileName={cropFileName}
          onConfirm={handleCropConfirm}
          onClose={() => setCropSrc(null)}
        />
      )}
    </>
  )
}
