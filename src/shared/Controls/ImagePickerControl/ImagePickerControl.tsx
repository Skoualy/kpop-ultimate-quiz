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
  currentCredit,
  label,
  hint,
  aspectRatio = '1/1',
  disabled = false,
  outputWidth,
  outputHeight,
}: ImagePickerControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc]           = useState<string | null>(null)
  const [cropFileName, setCropFileName] = useState<string | undefined>(undefined)
  const [editMode, setEditMode]         = useState(false)
  // Chaque ouverture du modal reçoit une key différente → remount garanti →
  // useState lazy init s'exécute toujours avec les bonnes props (initialCredit)
  const [modalKey, setModalKey] = useState(0)

  const originalFileRef = useRef<{
    name: string
    mimeType: string
    width: number | null
    height: number | null
  } | null>(null)

  const outW = outputWidth ?? (aspectRatio === '400/533' ? 400 : 600)
  const outH = outputHeight ?? (aspectRatio === '400/533' ? 533 : 600)
  const cropAspect = outW / outH

  // ── Upload d'un nouveau fichier ─────────────────────────────────────────────

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return
    const file = e.target.files?.[0]
    if (!file) return

    // Wikimedia SVG : "image.svg.png" → "image.svg"
    const normalizedName = file.name.endsWith('.svg.png')
      ? file.name.slice(0, -4)
      : file.name

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        originalFileRef.current = {
          name:     normalizedName,
          mimeType: file.type,
          width:    img.naturalWidth,
          height:   img.naturalHeight,
        }
      }
      img.src = dataUrl
      setCropFileName(normalizedName)
      setEditMode(false)
      setModalKey((k) => k + 1)  // nouvelle key → remount propre
      setCropSrc(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Mode édition — clic sur ✎ ──────────────────────────────────────────────

  function handleEdit(e: React.MouseEvent) {
    if (disabled || !value) return
    e.stopPropagation()
    // Conserver le nom de fichier : issu du crédit courant, sinon du dernier upload
    const fname = currentCredit?.originalFileName ?? cropFileName ?? undefined
    setCropFileName(fname)
    setEditMode(true)
    setModalKey((k) => k + 1)  // nouvelle key → remount propre avec initialCredit à jour
    setCropSrc(value)
  }

  // ── Suppression ────────────────────────────────────────────────────────────

  function handleClear(e: React.MouseEvent) {
    if (disabled) return
    e.stopPropagation()
    onChange('')
    onFileChange?.(null)
    originalFileRef.current = null
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Confirmation du crop / crédit ──────────────────────────────────────────

  function handleCropConfirm(dataUrl: string, blob: Blob, creditFromModal: ImageCreditInput) {
    onChange(dataUrl)

    if (!editMode) {
      // Mode upload : on crée un fichier
      onFileChange?.(new File([blob], 'image.webp', { type: 'image/webp' }))
    }
    // Mode édition pur (✎) : pas de onFileChange — fichier existant conservé

    const orig = originalFileRef.current
    let report: ImageTransformReport | null = null

    if (!editMode && orig) {
      report = {
        originalFileName:   orig.name,
        originalMimeType:   orig.mimeType,
        originalWidth:      orig.width,
        originalHeight:     orig.height,
        finalMimeType:      'image/webp',
        finalWidth:         outW,
        finalHeight:        outH,
        wasCropped:         true,
        wasResized:         orig.width !== outW || orig.height !== outH,
        wasConvertedToWebp: orig.mimeType !== 'image/webp',
      }
      onTransformReport?.(report)
    } else if (editMode) {
      // En édition : conserver le transformReport existant
      report = currentCredit?.transformReport ?? null
    }

    onCreditChange?.({ ...creditFromModal, transformReport: report })
    setCropSrc(null)
    setEditMode(false)
  }

  function handleClose() {
    setCropSrc(null)
    setEditMode(false)
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
                onError={(ev) => {
                  ev.currentTarget.onerror = null
                  ev.currentTarget.src = placeholderImage ?? ''
                }}
              />
              {!disabled && <div className={styles.hoverOverlay}>✎ Changer</div>}
              {/* Bouton édition — haut gauche */}
              {!disabled && (
                <button
                  className={styles.editBtn}
                  onClick={handleEdit}
                  title="Modifier le recadrage ou la source"
                  type="button"
                >
                  ✎
                </button>
              )}
              {/* Bouton suppression — haut droit */}
              {!disabled && (
                <button
                  className={styles.clearBtn}
                  onClick={handleClear}
                  title="Supprimer"
                  type="button"
                >
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
          key={modalKey}         // ← garantit un remount propre à chaque ouverture
          src={cropSrc}
          cropAspect={cropAspect}
          outputWidth={outW}
          outputHeight={outH}
          originalFileName={cropFileName}
          initialCredit={editMode ? (currentCredit ?? undefined) : undefined}
          onConfirm={handleCropConfirm}
          onClose={handleClose}
        />
      )}
    </>
  )
}
