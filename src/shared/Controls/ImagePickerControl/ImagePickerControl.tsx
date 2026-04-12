import { useRef, useState } from 'react'
import { ImageCropModal } from './ImageCropModal'
import type { ImagePickerControlProps } from './ImagePickerControl.types'
import styles from './ImagePickerControl.module.scss'

export function ImagePickerControl({
  value,
  placeholderImage,
  onChange,
  onFileChange,
  label,
  hint,
  aspectRatio = '1/1',
  emptyIcon = '🖼',
  disabled = false,
  outputWidth,
  outputHeight,
}: ImagePickerControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const outW = outputWidth ?? (aspectRatio === '400/533' ? 400 : 600)
  const outH = outputHeight ?? (aspectRatio === '400/533' ? 533 : 600)
  const cropAspect = outW / outH

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return

    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleClear(e: React.MouseEvent) {
    if (disabled) return
    e.stopPropagation()
    onChange('')
    onFileChange?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleCropConfirm(dataUrl: string, blob: Blob) {
    onChange(dataUrl)
    const file = new File([blob], 'image.webp', { type: 'image/webp' })
    onFileChange?.(file)
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
                  event.currentTarget.src = placeholderImage ?? ""
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
              <div className={styles.empty}>
                <span className={styles.icon}>{emptyIcon}</span>
              </div>
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
          onConfirm={handleCropConfirm}
          onClose={() => setCropSrc(null)}
        />
      )}
    </>
  )
}
