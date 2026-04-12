import { ContributorStep } from '@/features/contributor/components/ContributorStep'
import { SelectLanguageControl } from '@/shared/Controls/SelectLanguageControl'
import { YouTubeFrameControl } from '@/shared/Controls/YouTubeFrameControl'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import type { LanguageCode } from '@/shared/models'
import { type EditableSong } from './SongsStep.types'
import styles from './SongsStep.module.scss'
import { GeneratedIdInputControl } from '@/shared/Controls/GeneratedIdInputControl/GeneratedIdInputControl'
import { SongsStepServices } from './SongsStep.services'

interface SongsStepProps {
  titles: EditableSong[]
  setTitles: React.Dispatch<React.SetStateAction<EditableSong[]>>
  bSides: EditableSong[]
  setBSides: React.Dispatch<React.SetStateAction<EditableSong[]>>
  isSubunit: boolean
  isSoloist: boolean
  errors?: string[]
}

export function SongsStep({ titles, setTitles, bSides, setBSides, isSubunit, isSoloist, errors }: SongsStepProps) {
  void isSubunit
  void isSoloist
  const showBSides = true

  function updateSong(
    setter: React.Dispatch<React.SetStateAction<EditableSong[]>>,
    key: string,
    patch: Partial<EditableSong>,
  ) {
    setter((prev) =>
      prev.map((song) => {
        if (song._uiKey !== key) return song

        const updated = { ...song, ...patch }
        updated.id = SongsStepServices.buildSongId(updated.title, updated.language)
        return updated
      }),
    )
  }

  function removeSong(setter: React.Dispatch<React.SetStateAction<EditableSong[]>>, key: string) {
    setter((prev) => prev.filter((song) => song._uiKey !== key))
  }

  function addSong(setter: React.Dispatch<React.SetStateAction<EditableSong[]>>) {
    setter((prev) => [SongsStepServices.emptySong(), ...prev])
  }

  function handleDebutToggle(key: string, checked: boolean) {
    setTitles((prev) =>
      prev.map((song) => ({
        ...song,
        isDebutSong: song._uiKey === key ? checked : checked ? false : song.isDebutSong,
      })),
    )
  }

  return (
    <ContributorStep errors={errors}>
      <SongSection
        title="Title tracks"
        subtitle="au moins un requis"
        addLabel="+ Ajouter"
        warning="⚠ Vérifie bien l’orthographe des titres. Ils seront utilisés comme réponses pour le blind test."
        songs={titles}
        onAdd={() => addSong(setTitles)}
        renderSong={(song) => (
          <SongCard
            key={song._uiKey}
            song={song}
            songs={titles}
            showDebutFlag
            onUpdate={(patch) => updateSong(setTitles, song._uiKey, patch)}
            onRemove={() => removeSong(setTitles, song._uiKey)}
            onDebutToggle={(checked) => handleDebutToggle(song._uiKey, checked)}
          />
        )}
      />

      {showBSides && (
        <SongSection
          title="B-sides"
          subtitle="optionnel"
          addLabel="+ Ajouter"
          songs={bSides}
          onAdd={() => addSong(setBSides)}
          renderSong={(song) => (
            <SongCard
              key={song._uiKey}
              song={song}
              songs={bSides}
              showDebutFlag={false}
              onUpdate={(patch) => updateSong(setBSides, song._uiKey, patch)}
              onRemove={() => removeSong(setBSides, song._uiKey)}
            />
          )}
        />
      )}
    </ContributorStep>
  )
}

interface SongSectionProps {
  title: string
  subtitle?: string
  addLabel: string
  warning?: string
  songs: EditableSong[]
  onAdd: () => void
  renderSong: (song: EditableSong) => React.ReactNode
}

function SongSection({ title, subtitle, addLabel, warning, songs, onAdd, renderSong }: SongSectionProps) {
  return (
    <section className={styles.section}>
      {warning && <div className={styles.warning}>{warning}</div>}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <span className={styles.sectionTitle}>{title}</span>
          {subtitle && <span className={styles.sectionSubtitle}>({subtitle})</span>}
        </div>

        <button type="button" className="btn btn--secondary btn--sm" onClick={onAdd}>
          {addLabel}
        </button>
      </div>

      <div className={styles.cards}>
        {songs.length > 0 ? (
          songs.map(renderSong)
        ) : (
          <div className={styles.emptyState}>Aucune chanson pour le moment.</div>
        )}
      </div>
    </section>
  )
}

interface SongCardProps {
  song: EditableSong
  songs: EditableSong[]
  onUpdate: (patch: Partial<EditableSong>) => void
  onRemove: () => void
  showDebutFlag: boolean
  onDebutToggle?: (checked: boolean) => void
}

function SongCard({ song, songs, onUpdate, onRemove, showDebutFlag, onDebutToggle }: SongCardProps) {
  const currentSongKey = SongsStepServices.buildSongId(song.title, song.language)

  const duplicateSong =
    currentSongKey.length > 0
      ? songs.find(
          (candidate) =>
            candidate._uiKey !== song._uiKey &&
            SongsStepServices.buildSongId(candidate.title, candidate.language) === currentSongKey,
        )
      : null

  return (
    <article className={styles.card}>
      <div className={styles.thumbCol}>
        <YouTubeFrameControl youtubeUrl={song.youtubeUrl} height={182} />
      </div>

      <div className={styles.mainCol}>
        <div className={styles.topRow}>
          <div className={styles.field}>
            <GeneratedIdInputControl
              label="Titre"
              required
              value={song.title}
              onChange={(value) => onUpdate({ title: value })}
              generatedId={SongsStepServices.buildSongId(song.title, song.language)}
              exists={songs
                .filter((s) => s._uiKey !== song._uiKey)
                .some(
                  (s) =>
                    SongsStepServices.buildSongId(s.title, s.language) ===
                    SongsStepServices.buildSongId(song.title, song.language),
                )}
              placeholder="Ex: Feel Special"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Langue</label>
            <SelectLanguageControl
              value={song.language}
              onChange={(value: LanguageCode | '') => onUpdate({ language: value })}
            />
          </div>
        </div>

        {duplicateSong && (
          <div className={styles.errorInline}>
            Ce titre existe déjà dans cette liste. Change le titre ou la langue si c'est une autre version.
          </div>
        )}

        <div className={styles.urlRow}>
          <div className={styles.field}>
            <label className={styles.label}>
              Lien YouTube <span className={styles.required}>*</span>
            </label>
            <input
              className="input"
              value={song.youtubeUrl}
              placeholder="https://www.youtube.com/watch?v=..."
              onChange={(e) => onUpdate({ youtubeUrl: e.target.value })}
            />
            {song.youtubeUrl.trim() && !SongsStepServices.isYoutubeUrlValid(song.youtubeUrl) && (
              <span className={styles.errorInline}>URL YouTube invalide (miniature introuvable)</span>
            )}
          </div>
        </div>

        <div className={styles.bottomRow}>
          {showDebutFlag ? (
            <div className={styles.debutRow}>
              <ToggleControl checked={song.isDebutSong} onChange={(checked) => onDebutToggle?.(checked)} size="sm" />
              <span className={styles.debutLabel}>Chanson de début</span>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>

      <div className={styles.actionsCol}>
        <button type="button" className="btn btn--danger btn--sm" onClick={onRemove}>
          🗑 Supprimer
        </button>
      </div>
    </article>
  )
}
