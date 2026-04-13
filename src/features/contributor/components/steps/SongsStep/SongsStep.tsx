import { useMemo, useState } from 'react'
import { ContributorStep } from '@/features/contributor/components/ContributorStep'
import { SelectLanguageControl } from '@/shared/Controls/SelectLanguageControl'
import { YouTubeFrameControl } from '@/shared/Controls/YouTubeFrameControl'
import { ToggleControl } from '@/shared/Controls/ToggleControl'
import { PaginationControl } from '@/shared/Components/PaginationControl'
import { CollapsibleSection } from '@/shared/Components/CollapsibleSection'
import { ScrollTopControl } from '@/shared/Controls/ScrollTopControl'
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

const SONGS_PAGE_SIZES = [10, 15, 20, 25, 30]

export function SongsStep({ titles, setTitles, bSides, setBSides, isSubunit, isSoloist, errors }: SongsStepProps) {
  void isSubunit
  void isSoloist
  const showBSides = true

  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState<LanguageCode | ''>('')
  const [pageSize, setPageSize] = useState(10)
  const [titlePage, setTitlePage] = useState(1)
  const [bSidePage, setBSidePage] = useState(1)

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

  function moveSong(
    setter: React.Dispatch<React.SetStateAction<EditableSong[]>>,
    key: string,
    direction: 'up' | 'down',
  ) {
    setter((prev) => {
      const index = prev.findIndex((song) => song._uiKey === key)
      if (index < 0) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev

      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  function transferSong(key: string, from: 'titles' | 'bsides') {
    if (from === 'titles') {
      const song = titles.find((item) => item._uiKey === key)
      if (!song) return
      setTitles((prev) => prev.filter((item) => item._uiKey !== key))
      setBSides((prev) => [{ ...song, isDebutSong: false }, ...prev])
      return
    }

    const song = bSides.find((item) => item._uiKey === key)
    if (!song) return
    setBSides((prev) => prev.filter((item) => item._uiKey !== key))
    setTitles((prev) => [{ ...song }, ...prev])
  }

  function handleDebutToggle(key: string, checked: boolean) {
    setTitles((prev) =>
      prev.map((song) => ({
        ...song,
        isDebutSong: song._uiKey === key ? checked : checked ? false : song.isDebutSong,
      })),
    )
  }

  const titleCrossDuplicateIds = useMemo(() => SongsStepServices.findCrossBucketDuplicates(titles, bSides), [titles, bSides])
  const bSideCrossDuplicateIds = useMemo(() => SongsStepServices.findCrossBucketDuplicates(bSides, titles), [titles, bSides])

  const filterBySearchAndLanguage = (song: EditableSong) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || song.title.toLowerCase().includes(q)
    const matchesLanguage = !languageFilter || song.language === languageFilter
    return matchesSearch && matchesLanguage
  }

  const filteredTitles = titles.filter(filterBySearchAndLanguage)
  const filteredBSides = bSides.filter(filterBySearchAndLanguage)

  const titleStart = (titlePage - 1) * pageSize
  const bSideStart = (bSidePage - 1) * pageSize
  const pagedTitles = filteredTitles.slice(titleStart, titleStart + pageSize)
  const pagedBSides = filteredBSides.slice(bSideStart, bSideStart + pageSize)

  return (
    <ContributorStep errors={errors}>
      <div className={styles.warning}>⚠ Vérifie bien l’orthographe des titres. Ils seront utilisés comme réponses pour le blind test.</div>

      <div className={styles.toolbar}>
        <input
          className="input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setTitlePage(1)
            setBSidePage(1)
          }}
          placeholder="Rechercher une chanson..."
        />
        <div className={styles.toolbarRight}>
          <SelectLanguageControl
            value={languageFilter}
            onChange={(value: LanguageCode | '') => {
              setLanguageFilter(value)
              setTitlePage(1)
              setBSidePage(1)
            }}
          />
          <label className={styles.pageSizeInline}>
            <span>Par page</span>
            <select
              className="select"
              value={String(pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setTitlePage(1)
                setBSidePage(1)
              }}
            >
              {SONGS_PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <CollapsibleSection
        title="Title tracks"
        subtitle="au moins un requis"
        actions={
          <button type="button" className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); addSong(setTitles) }}>
            + Ajouter
          </button>
        }
      >
        <div className={styles.cards}>
          {pagedTitles.length > 0 ? (
            pagedTitles.map((song) => (
              <SongCard
                key={song._uiKey}
                song={song}
                songs={titles}
                inOtherBucket={titleCrossDuplicateIds.has(song._uiKey)}
                showDebutFlag
                onUpdate={(patch) => updateSong(setTitles, song._uiKey, patch)}
                onRemove={() => removeSong(setTitles, song._uiKey)}
                onDebutToggle={(checked) => handleDebutToggle(song._uiKey, checked)}
                onMoveUp={() => moveSong(setTitles, song._uiKey, 'up')}
                onMoveDown={() => moveSong(setTitles, song._uiKey, 'down')}
                onSwitchBucket={() => transferSong(song._uiKey, 'titles')}
              />
            ))
          ) : (
            <div className={styles.emptyState}>Aucune chanson pour le moment.</div>
          )}
        </div>

        {filteredTitles.length > 10 && (
          <PaginationControl
            currentPage={titlePage}
            totalItems={filteredTitles.length}
            pageSize={pageSize}
            pageSizeOptions={SONGS_PAGE_SIZES}
            onPageChange={setTitlePage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setTitlePage(1)
              setBSidePage(1)
            }}
          />
        )}
      </CollapsibleSection>

      {showBSides && (
        <CollapsibleSection
          title="B-sides"
          subtitle="optionnel"
          actions={
            <button type="button" className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); addSong(setBSides) }}>
              + Ajouter
            </button>
          }
        >
          <div className={styles.cards}>
            {pagedBSides.length > 0 ? (
              pagedBSides.map((song) => (
                <SongCard
                  key={song._uiKey}
                  song={song}
                  songs={bSides}
                  inOtherBucket={bSideCrossDuplicateIds.has(song._uiKey)}
                  showDebutFlag={false}
                  onUpdate={(patch) => updateSong(setBSides, song._uiKey, patch)}
                  onRemove={() => removeSong(setBSides, song._uiKey)}
                  onMoveUp={() => moveSong(setBSides, song._uiKey, 'up')}
                  onMoveDown={() => moveSong(setBSides, song._uiKey, 'down')}
                  onSwitchBucket={() => transferSong(song._uiKey, 'bsides')}
                />
              ))
            ) : (
              <div className={styles.emptyState}>Aucune chanson pour le moment.</div>
            )}
          </div>

          {filteredBSides.length > 10 && (
            <PaginationControl
              currentPage={bSidePage}
              totalItems={filteredBSides.length}
              pageSize={pageSize}
              pageSizeOptions={SONGS_PAGE_SIZES}
              onPageChange={setBSidePage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setTitlePage(1)
                setBSidePage(1)
              }}
            />
          )}
        </CollapsibleSection>
      )}
      <ScrollTopControl />
    </ContributorStep>
  )
}

interface SongCardProps {
  song: EditableSong
  songs: EditableSong[]
  inOtherBucket: boolean
  onUpdate: (patch: Partial<EditableSong>) => void
  onRemove: () => void
  showDebutFlag: boolean
  onDebutToggle?: (checked: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onSwitchBucket: () => void
}

function SongCard({
  song,
  songs,
  inOtherBucket,
  onUpdate,
  onRemove,
  showDebutFlag,
  onDebutToggle,
  onMoveUp,
  onMoveDown,
  onSwitchBucket,
}: SongCardProps) {
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
    <article className={styles.card} draggable={false}>
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
        {inOtherBucket && <div className={styles.errorInline}>Ce titre existe déjà dans l’autre section (title/b-side).</div>}

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
        <button type="button" className="btn btn--ghost btn--sm" onClick={onMoveUp}>↑</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onMoveDown}>↓</button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onSwitchBucket}>⇄</button>
        <button type="button" className="btn btn--danger btn--sm" onClick={onRemove}>
          🗑 Supprimer
        </button>
      </div>
    </article>
  )
}
