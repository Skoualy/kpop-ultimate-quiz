// ─── ImagePicker ──────────────────────────────────────────────────────────────
// Composant réutilisable pour sélectionner/prévisualiser une image.
// - Clic sur la zone d'aperçu → ouvre l'explorateur de fichiers
// - Crop modal automatique après sélection
// - Ratio configurable : 1:1 (cover groupe) ou 3:4 (portrait idole)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { ImageCropModal } from './ImageCropModal';

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  aspectRatio?: '1/1' | '3/4';
  hint?: string;
  emptyIcon?: string;
  outputWidth?: number;
  outputHeight?: number;
}

export function ImagePicker({
  value,
  onChange,
  label,
  aspectRatio = '1/1',
  hint,
  emptyIcon = '🖼️',
  outputWidth,
  outputHeight,
}: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const outW = outputWidth ?? (aspectRatio === '3/4' ? 400 : 600);
  const outH = outputHeight ?? (aspectRatio === '3/4' ? 533 : 600);
  const cropAspect = aspectRatio === '3/4' ? 3 / 4 : 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && <label className="form-label">{label}</label>}

        <div
          onClick={() => fileInputRef.current?.click()}
          title="Cliquer pour choisir une image"
          style={{
            width: '65%',
            aspectRatio,
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
            position: 'relative',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent-purple)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
          }}
        >
          {value ? (
            <img
              src={value}
              alt="aperçu"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              onLoad={(e) => {
                (e.target as HTMLImageElement).style.display = 'block';
              }}
            />
          ) : (
            <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>{emptyIcon}</span>
          )}
          {value && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                fontSize: 12,
                color: 'transparent',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(0,0,0,0.45)';
                el.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.background = 'rgba(0,0,0,0)';
                el.style.color = 'transparent';
              }}
            >
              ✎ Changer
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/webp,image/jpeg,image/jpg,image/png,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{hint}</span>}
      </div>

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          cropAspect={cropAspect}
          outputWidth={outW}
          outputHeight={outH}
          onConfirm={(dataUrl) => {
            onChange(dataUrl);
            setCropSrc(null);
          }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </>
  );
}
