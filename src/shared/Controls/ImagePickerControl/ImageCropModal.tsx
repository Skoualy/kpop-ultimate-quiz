import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './ImageCropModal.module.scss'

interface ImageCropModalProps {
  src:          string
  cropAspect:   number   // 1 = carré, 0.75 = 3:4 portrait
  outputWidth:  number
  outputHeight: number
  onConfirm:    (dataUrl: string, blob: Blob) => void
  onClose:      () => void
}

const DISPLAY_MAX = 480

export function ImageCropModal({
  src, cropAspect, outputWidth, outputHeight, onConfirm, onClose,
}: ImageCropModalProps) {
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [cropPos,     setCropPos]     = useState({ x: 0, y: 0 })
  const [cropBox,     setCropBox]     = useState({ w: 0, h: 0 })
  // scale 10–100 % : réduit l'image source avant affichage (effet dézoom)
  //const [scale,       setScale]       = useState(100)
  // src redimensionné selon le scale
  const [scaledSrc,   setScaledSrc]   = useState(src)

  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)

  // ─── Calcul displaySize + cropBox selon l'image source scalée ────────────────
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

  // ─── Redimensionner l'image source selon le scale ────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const ratio = 100 / 100
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.naturalWidth  * ratio)
      canvas.height = Math.round(img.naturalHeight * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const newSrc = canvas.toDataURL('image/webp', 0.92)
      setScaledSrc(newSrc)
      computeLayout(newSrc)
    }
    img.src = src
  }, [src])

  // ─── Drag souris ─────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: cropPos.x, oy: cropPos.y }
  }, [cropPos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      setCropPos(() => ({
        x: Math.max(0, Math.min(displaySize.w - cropBox.w, dragStart.current!.ox + dx)),
        y: Math.max(0, Math.min(displaySize.h - cropBox.h, dragStart.current!.oy + dy)),
      }))
    }
    const onUp = () => { dragStart.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [displaySize, cropBox])

  // ─── Touch ───────────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: cropPos.x, oy: cropPos.y }
  }, [cropPos])

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!dragStart.current) return
      const t = e.touches[0]
      const dx = t.clientX - dragStart.current.mx
      const dy = t.clientY - dragStart.current.my
      setCropPos(() => ({
        x: Math.max(0, Math.min(displaySize.w - cropBox.w, dragStart.current!.ox + dx)),
        y: Math.max(0, Math.min(displaySize.h - cropBox.h, dragStart.current!.oy + dy)),
      }))
    }
    const onEnd = () => { dragStart.current = null }
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
  }, [displaySize, cropBox])

  // ─── Export crop → toujours outputWidth × outputHeight ───────────────────────
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
        onConfirm(dataUrl, blob)
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

        {/* Corps : zone image + slider zoom à droite */}
        <div className={styles.body}>
          {/* Zone de crop */}
          <div className={styles.cropArea} style={{ width: displaySize.w, height: displaySize.h }}>
            <img src={scaledSrc} draggable={false} className={styles.cropImg}
              style={{ width: displaySize.w, height: displaySize.h }} />
            {/* Overlays sombres */}
            <div className={styles.overlayTop}    style={{ height: cropPos.y }} />
            <div className={styles.overlayBottom} style={{ top: cropPos.y + cropBox.h }} />
            <div className={styles.overlayLeft}   style={{ top: cropPos.y, width: cropPos.x, height: cropBox.h }} />
            <div className={styles.overlayRight}  style={{ top: cropPos.y, left: cropPos.x + cropBox.w, height: cropBox.h }} />
            {/* Crop box draggable */}
            <div className={styles.cropBox}
              style={{ left: cropPos.x, top: cropPos.y, width: cropBox.w, height: cropBox.h }}
              onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
              {/* Règle des tiers */}
              {[1/3, 2/3].map((r) => (
                <div key={`v${r}`} className={styles.thirdV} style={{ left: `${r * 100}%` }} />
              ))}
              {[1/3, 2/3].map((r) => (
                <div key={`h${r}`} className={styles.thirdH} style={{ top: `${r * 100}%` }} />
              ))}
              {/* Coins */}
              <div className={`${styles.corner} ${styles.cornerTL}`} />
              <div className={`${styles.corner} ${styles.cornerTR}`} />
              <div className={`${styles.corner} ${styles.cornerBL}`} />
              <div className={`${styles.corner} ${styles.cornerBR}`} />
            </div>
          </div>

          {/* Slider zoom vertical */}
          {/* <div className={styles.zoomPanel}>
            <span className={styles.zoomLabel}>🔍</span>
            <input
              type="range"          
              className={styles.zoomSlider}
              min={10} max={100} step={1}
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value))}
              title={`Zoom source : ${scale}%`}
            />
            <span className={styles.zoomLabel}>🔎</span>
            <span className={styles.zoomValue}>{scale}%</span>
          </div>
         */}
        </div>

        {/* Boutons */}
        <div className={styles.actions}>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn--primary" onClick={handleConfirm}>✓ Confirmer</button>
        </div>
      </div>
    </div>
  )
}
