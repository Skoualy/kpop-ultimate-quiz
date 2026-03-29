// ─── SongsStep ────────────────────────────────────────────────────────────────
// Étape 3 du formulaire contributor : title tracks et b-sides.
// ─────────────────────────────────────────────────────────────────────────────

import type { LanguageCode } from '../../types';
import { LANGUAGE_OPTIONS } from '../../constants/mappings';
import { getYouTubeThumbnail, slugify } from '../../services/dataService';
import { ContributorStep } from './ContributorStep';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EditableSong {
  _key: string;
  id: string;
  title: string;
  youtubeUrl: string;
  language: LanguageCode | '';
  isDebutSong: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateSongs(titles: EditableSong[], bSides: EditableSong[]): string[] {
  const errors: string[] = [];
  for (const s of [...titles, ...bSides]) {
    if (s.title && !s.youtubeUrl) {
      errors.push(`"${s.title}" : URL YouTube manquante`);
    }
    if (s.youtubeUrl && !s.title) {
      errors.push("Une chanson a une URL YouTube mais pas de titre");
    }
  }
  return errors;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emptySong(): EditableSong {
  return {
    _key: Math.random().toString(36).slice(2),
    id: '',
    title: '',
    youtubeUrl: '',
    language: '',
    isDebutSong: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SongsStepProps {
  titles: EditableSong[];
  setTitles: React.Dispatch<React.SetStateAction<EditableSong[]>>;
  bSides: EditableSong[];
  setBSides: React.Dispatch<React.SetStateAction<EditableSong[]>>;
  errors?: string[];
}

export function SongsStep({ titles, setTitles, bSides, setBSides, errors }: SongsStepProps) {
  return (
    <ContributorStep errors={errors}>
      <SongList label="Title tracks" songs={titles} setSongs={setTitles} showDebutFlag />
      <SongList label="B-sides" songs={bSides} setSongs={setBSides} showDebutFlag={false} />
    </ContributorStep>
  );
}

// ─── SongList ─────────────────────────────────────────────────────────────────

interface SongListProps {
  label: string;
  songs: EditableSong[];
  setSongs: React.Dispatch<React.SetStateAction<EditableSong[]>>;
  showDebutFlag: boolean;
}

function SongList({ label, songs, setSongs, showDebutFlag }: SongListProps) {
  const update = (key: string, field: keyof EditableSong, value: string | boolean) => {
    setSongs((prev) =>
      prev.map((s) => {
        if (s._key !== key) return s;
        const updated = { ...s, [field]: value };
        if (field === 'title') updated.id = slugify(String(value));
        return updated;
      })
    );
  };

  const remove = (key: string) => setSongs((prev) => prev.filter((s) => s._key !== key));
  const add = () => setSongs((prev) => [...prev, emptySong()]);

  return (
    <div className="songs-section">
      <div className="songs-section__title">
        {label}
        <button className="btn btn--secondary btn--sm" onClick={add}>
          + Ajouter
        </button>
      </div>
      <div className="songs-warning">
        ⚠️ <strong>Vérifiez les noms</strong> — utilisés comme réponses en blind test. Le titre doit
        être en anglais ou latin, sans caractères coréens.
      </div>

      {songs.map((s) => {
        const thumb = s.youtubeUrl ? getYouTubeThumbnail(s.youtubeUrl) : null;
        return (
          <div key={s._key} className="song-row">
            <div className="song-row__fields">
              <div className="song-row__header">
                <button className="btn btn--danger btn--sm" onClick={() => remove(s._key)}>
                  🗑 Supprimer
                </button>
              </div>
              <div className="form-field">
                <label className="form-label">
                  Titre <span>*</span>{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    (nom exact, sans caractères coréens ni crochets)
                  </span>
                </label>
                <input
                  className="input"
                  value={s.title}
                  onChange={(e) => update(s._key, 'title', e.target.value)}
                  placeholder="Ex: Feel Special"
                />
              </div>
              <div className="form-field">
                <label className="form-label">
                  Lien YouTube <span>*</span>
                </label>
                <input
                  className="input"
                  value={s.youtubeUrl}
                  onChange={(e) => update(s._key, 'youtubeUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div className="song-row__options">
                <div className="form-field">
                  <label className="form-label">Langue</label>
                  <select
                    className="select"
                    style={{ width: 'auto', minWidth: 120 }}
                    value={s.language}
                    onChange={(e) => update(s._key, 'language', e.target.value)}
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {showDebutFlag && (
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={s.isDebutSong}
                      onChange={(e) => update(s._key, 'isDebutSong', e.target.checked)}
                    />
                    Chanson de début
                  </label>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="song-thumbnail">
                {thumb ? (
                  <img src={thumb} alt={s.title} />
                ) : (
                  <div className="song-thumbnail__placeholder">🎵</div>
                )}
              </div>
              {s.youtubeUrl && (
                <a
                  href={s.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--ghost btn--sm"
                  style={{ justifyContent: 'center' }}
                >
                  ▶ Regarder
                </a>
              )}
            </div>
          </div>
        );
      })}

      {songs.length === 0 && (
        <button className="btn btn--secondary" onClick={add} style={{ alignSelf: 'flex-start' }}>
          + Ajouter une chanson
        </button>
      )}
    </div>
  );
}
