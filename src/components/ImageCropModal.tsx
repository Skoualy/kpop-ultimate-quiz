// ─── ImageCropModal ────────────────────────────────────────────────────────────
// Modal de recadrage générique — inspiré Discord (drag pour repositionner).
// Utilisé pour : cover groupe (1:1, 600×600) et portrait idole (3:4, 400×533).

import { useState, useEffect, useRef, useCallback } from 'react';

interface ImageCropModalProps {
  /** dataURL de l'image source uploadée */
  src: string;
  /** Ratio du crop : 1 pour carré (1:1), 0.75 pour portrait (3:4) */
  cropAspect: number;
  /** Largeur de sortie en pixels (ex: 600) */
  outputWidth: number;
  /** Hauteur de sortie en pixels (ex: 600) */
  outputHeight: number;
  onConfirm: (croppedDataUrl: string) => void;
  onClose: () => void;
}

const DISPLAY_MAX = 480; // taille max de la zone d'aperçu en px

export function ImageCropModal({
  src,
  cropAspect,
  outputWidth,
  outputHeight,
  onConfirm,
  onClose,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Taille de l'image affichée ───────────────────────────────────────────────
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  // ─── Position du crop box (coins haut-gauche, en px display) ─────────────────
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  // ─── Taille du crop box (en px display) ──────────────────────────────────────
  const [cropBox, setCropBox] = useState({ w: 0, h: 0 });
  // ─── Drag state ───────────────────────────────────────────────────────────────
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Charger l'image et calculer les dimensions d'affichage
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      // Scale pour rentrer dans DISPLAY_MAX × DISPLAY_MAX
      const scale = Math.min(DISPLAY_MAX / img.naturalWidth, DISPLAY_MAX / img.naturalHeight, 1);
      const dw = Math.round(img.naturalWidth * scale);
      const dh = Math.round(img.naturalHeight * scale);
      setDisplaySize({ w: dw, h: dh });

      // Crop box initial : centré, couvre le max possible avec le bon aspect
      let cw: number, ch: number;
      if (cropAspect >= 1) {
        // Carré ou plus large
        cw = Math.min(dw, dh * cropAspect);
        ch = cw / cropAspect;
      } else {
        // Portrait
        ch = Math.min(dh, dw / cropAspect);
        cw = ch * cropAspect;
      }
      cw = Math.round(cw);
      ch = Math.round(ch);
      setCropBox({ w: cw, h: ch });
      setCropPos({ x: Math.round((dw - cw) / 2), y: Math.round((dh - ch) / 2) });
    };
    img.src = src;
  }, [src, cropAspect]);

  // ─── Drag handlers ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: cropPos.x, oy: cropPos.y };
  }, [cropPos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      setCropPos((prev) => {
        const nx = Math.max(0, Math.min(displaySize.w - cropBox.w, dragStart.current!.ox + dx));
        const ny = Math.max(0, Math.min(displaySize.h - cropBox.h, dragStart.current!.oy + dy));
        return { x: Math.round(nx), y: Math.round(ny) };
      });
    };
    const onUp = () => { dragStart.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [displaySize, cropBox]);

  // ─── Touch support ────────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    dragStart.current = { mx: t.clientX, my: t.clientY, ox: cropPos.x, oy: cropPos.y };
  }, [cropPos]);

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!dragStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.mx;
      const dy = t.clientY - dragStart.current.my;
      setCropPos(() => {
        const nx = Math.max(0, Math.min(displaySize.w - cropBox.w, dragStart.current!.ox + dx));
        const ny = Math.max(0, Math.min(displaySize.h - cropBox.h, dragStart.current!.oy + dy));
        return { x: Math.round(nx), y: Math.round(ny) };
      });
    };
    const onEnd = () => { dragStart.current = null; };
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [displaySize, cropBox]);

  // ─── Export du crop ───────────────────────────────────────────────────────────
  const handleConfirm = () => {
    const img = new Image();
    img.onload = () => {
      // Ratio entre image naturelle et display
      const scaleX = img.naturalWidth / displaySize.w;
      const scaleY = img.naturalHeight / displaySize.h;

      // Coordonnées du crop dans l'image originale
      const srcX = Math.round(cropPos.x * scaleX);
      const srcY = Math.round(cropPos.y * scaleY);
      const srcW = Math.round(cropBox.w * scaleX);
      const srcH = Math.round(cropBox.h * scaleY);

      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight);
      onConfirm(canvas.toDataURL('image/webp', 0.92));
    };
    img.src = src;
  };

  if (displaySize.w === 0) return null;

  return (
    // Overlay sombre
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        maxWidth: '95vw',
      }}>
        {/* Titre */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Recadrer l'image</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Glisse le cadre pour repositionner · sortie {outputWidth}×{outputHeight}px
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-pill)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
              padding: '4px 10px', cursor: 'pointer', fontSize: 16,
            }}
          >✕</button>
        </div>

        {/* Zone d'aperçu */}
        <div style={{
          position: 'relative',
          width: displaySize.w,
          height: displaySize.h,
          userSelect: 'none',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          cursor: 'move',
        }}>
          {/* Image source */}
          <img
            ref={imgRef}
            src={src}
            draggable={false}
            style={{ width: displaySize.w, height: displaySize.h, display: 'block', objectFit: 'fill' }}
          />

          {/* Overlay sombre autour du crop */}
          {/* Haut */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: cropPos.y, background: 'rgba(0,0,0,0.55)' }} />
          {/* Bas */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: cropPos.y + cropBox.h, background: 'rgba(0,0,0,0.55)' }} />
          {/* Gauche */}
          <div style={{ position: 'absolute', top: cropPos.y, left: 0, width: cropPos.x, height: cropBox.h, background: 'rgba(0,0,0,0.55)' }} />
          {/* Droite */}
          <div style={{ position: 'absolute', top: cropPos.y, left: cropPos.x + cropBox.w, right: 0, height: cropBox.h, background: 'rgba(0,0,0,0.55)' }} />

          {/* Crop box — draggable */}
          <div
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            style={{
              position: 'absolute',
              left: cropPos.x, top: cropPos.y,
              width: cropBox.w, height: cropBox.h,
              border: '2px solid rgba(255,255,255,0.9)',
              boxSizing: 'border-box',
              cursor: 'move',
            }}
          >
            {/* Règle des tiers */}
            {[1/3, 2/3].map((r) => (
              <div key={`v${r}`} style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${r * 100}%`, width: 1,
                background: 'rgba(255,255,255,0.25)',
              }} />
            ))}
            {[1/3, 2/3].map((r) => (
              <div key={`h${r}`} style={{
                position: 'absolute', left: 0, right: 0,
                top: `${r * 100}%`, height: 1,
                background: 'rgba(255,255,255,0.25)',
              }} />
            ))}
            {/* Coins */}
            {[
              { top: 0, left: 0 }, { top: 0, right: 0 },
              { bottom: 0, left: 0 }, { bottom: 0, right: 0 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', width: 12, height: 12,
                borderColor: 'white', borderStyle: 'solid', borderWidth: 0,
                ...('top' in pos ? { borderTopWidth: 2 } : { borderBottomWidth: 2 }),
                ...('left' in pos ? { borderLeftWidth: 2 } : { borderRightWidth: 2 }),
                ...pos,
              }} />
            ))}
          </div>
        </div>

        {/* Canvas caché (non utilisé pour l'affichage) */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Boutons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn--primary" onClick={handleConfirm}>
            ✓ Confirmer le recadrage
          </button>
        </div>
      </div>
    </div>
  );
}
