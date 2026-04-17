import { useState, useEffect, useRef, useCallback } from 'react'
import { ImageSourceControl } from '@/shared/Controls/ImageSourceControl'
import type { ImageCreditInput } from '@/shared/models/AssetCredit'
import styles from './ImageCropModal.module.scss'

interface ImageCropModalProps {
  src:          string
  cropAspect:   number
  outputWidth:  number
  outputHeight: number
  /** Nom du fichier original — pré-remplit le champ source si fourni */
  originalFileName?: string
  onConfirm:    (dataUrl: string, blob: Blob, credit: ImageCreditInput) => void
  onClose:      () => void
}

const DISPLAY_MAX = 480
const EMPTY_CREDIT: ImageCreditInput = {
  sourceType: 'wikimedia',
  originalFileName: null,
  transformReport: null,
}

export function ImageCropModal({
  src, cropAspect, outputWidth, outputHeight, originalFileName, onConfirm, onClose,
}: ImageCropModalProps) {
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [cropPos,     setCropPos]     = useState({ x: 0, y: 0 })
  const [cropBox,     setCropBox]     = useState({ w: 0, h: 0 })
  const [scaledSrc,   setScaledSrc]   = useState(src)
  const [credit,      setCredit]      = useState<ImageCreditInput>({
    sourceType: 'wikimedia',
    originalFileName: originalFileName ?? null,
    transformReport: null,
  })

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  // ─── Init ────────────────────────────────────────────────────────────────────
  function computeLayout(imgSrc: string) {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(DISPLAY_MAX / img.naturalWidth, DISPLAY_MAX / img.naturalHeight, 1)
      const dw = Math.round(img.naturalWidth * s)
      const dh = Math.round(img.naturalHeight * s)
      setDisplaySize({ w: dw, h: dh })

      let cw: number, ch: number
      if (cropAspect >= 1) {
        cw = Math.min(dw, dh * cropAspect); ch = cw / cropAspect
      } else {
        ch = Math.min(dh, dw / cropAspect); cw = ch * cropAspect
      }
      cw = Math.round(cw); ch = Math.round(ch)
      setCropBox({ w: cw, h: ch })
      setCropPos({ x: Math.round((dw - cw) / 2), y: Math.round((dh - ch) / 2) })
    }
    img.src = imgSrc
  }

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const newSrc = canvas.toDataURL('image/webp', 0.92)
      setScaledSrc(newSrc)
      computeLayout(newSrc)
    }
    img.src = src
    // Reset credit avec le nom du fichier à chaque nouvelle image
    setCredit({
      sourceType: 'wikimedia',
      originalFileName: originalFileName ?? null,
      transformReport: null,
    })
  }, [src])

  // ─── Drag souris ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: cropPos.x, oy: cropPos.y }
  }, [cropPos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const start = dragStart.current
      if (!start) return
      const dx = e.clientX - start.mx
      const dy = e.clientY - start.my
      setCropPos({
        x: Math.max(0, Math.min(displaySize.w - cropBox.w, start.ox + dx)),
        y: Math.max(0, Math.min(displaySize.h - cropBox.h, start.oy + dy)),
      })
    }
    const onUp = () => { dragStart.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [displaySize, cropBox])

  // ─── Touch ───────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: cropPos.x, oy: cropPos.y }
  }, [cropPos])

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      const start = dragStart.current
      if (!start) return
      const t = e.touches[0]
      const dx = t.clientX - start.mx
      const dy = t.clientY - start.my
      setCropPos({
        x: Math.max(0, Math.min(displaySize.w - cropBox.w, start.ox + dx)),
        y: Math.max(0, Math.min(displaySize.h - cropBox.h, start.oy + dy)),
      })
    }
    const onEnd = () => { dragStart.current = null }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [displaySize, cropBox])

  // ─── Export ───────────────────────────────────────────────────────────────────
  function handleConfirm() {
    const img = new Image()
    img.onload = () => {
      const scaleX = img.naturalWidth  / displaySize.w
      const scaleY = img.naturalHeight / displaySize.h
      const srcX = Math.round(cropPos.x * scaleX)
      const srcY = Math.round(cropPos.y * scaleY)
      const srcW = Math.round(cropBox.w * scaleX)
      const srcH = Math.round(cropBox.h * scaleY)

      const canvas = document.createElement('canvas')
      canvas.width  = outputWidth
      canvas.height = outputHeight
      canvas.getContext('2d')!.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight)

      canvas.toBlob((blob) => {
        if (!blob) return
        const dataUrl = canvas.toDataURL('image/webp', 0.92)
        // Passer le credit avec le dataUrl et le blob
        onConfirm(dataUrl, blob, credit)
      }, 'image/webp', 0.92)
    }
    img.src = scaledSrc
  }

  if (displaySize.w === 0) return null

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <div className={styles.modalTitle}>Recadrer l'image</div>
            <div className={styles.modalSubtitle}>
              Glisse le cadre · sortie {outputWidth}×{outputHeight}px
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Zone de crop */}
        <div className={styles.body}>
          <div className={styles.cropArea} style={{ width: displaySize.w, height: displaySize.h }}>
            <img src={scaledSrc} draggable={false} className={styles.cropImg}
              style={{ width: displaySize.w, height: displaySize.h }} />
            <div className={styles.overlayTop}    style={{ height: cropPos.y }} />
            <div className={styles.overlayBottom} style={{ top: cropPos.y + cropBox.h }} />
            <div className={styles.overlayLeft}   style={{ top: cropPos.y, width: cropPos.x, height: cropBox.h }} />
            <div className={styles.overlayRight}  style={{ top: cropPos.y, left: cropPos.x + cropBox.w, height: cropBox.h }} />
            <div
              className={styles.cropBox}
              style={{ left: cropPos.x, top: cropPos.y, width: cropBox.w, height: cropBox.h }}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              <div className={styles.thirdV} style={{ left: '33.33%' }} />
              <div className={styles.thirdV} style={{ left: '66.66%' }} />
              <div className={styles.thirdH} style={{ top: '33.33%' }} />
              <div className={styles.thirdH} style={{ top: '66.66%' }} />
            </div>
          </div>
        </div>

        {/* Source de l'image — directement dans le modal */}
        <div className={styles.creditSection}>
          <ImageSourceControl
            value={credit}
            onChange={setCredit}
          />
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={['btn', 'btn--ghost'].join(' ')} onClick={onClose}>
            Annuler
          </button>
          <button className={['btn', 'btn--primary'].join(' ')} onClick={handleConfirm}>
            Valider le recadrage
          </button>
        </div>

      </div>
    </div>
  )
}
