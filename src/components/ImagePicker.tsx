// ─── ImagePicker ──────────────────────────────────────────────────────────────
// Composant réutilisable pour sélectionner/prévisualiser une image via URL.
// Utilisé pour : cover du groupe (ratio 1:1) et portrait des idoles (ratio 3:4).

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  /** '1/1' pour cover groupe, '3/4' pour portrait idole */
  aspectRatio?: '1/1' | '3/4';
  /** Texte affiché sous l'aperçu */
  hint?: string;
  /** Emoji affiché en placeholder si pas d'image */
  emptyIcon?: string;
}

export function ImagePicker({ value, onChange, label, aspectRatio = '1/1', hint, emptyIcon = '🖼️' }: ImagePickerProps) {
  const previewStyle: React.CSSProperties = {
    width: '100%',
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label className="form-label">{label}</label>}

      {/* Aperçu */}
      <div style={previewStyle}>
        {value ? (
          <img
            src={value}
            alt="aperçu"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              // Masque l'image si l'URL est invalide
              (e.target as HTMLImageElement).style.display = 'none';
            }}
            onLoad={(e) => {
              (e.target as HTMLImageElement).style.display = 'block';
            }}
          />
        ) : (
          <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>{emptyIcon}</span>
        )}
      </div>

      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{hint}</span>}
    </div>
  );
}
