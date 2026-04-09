import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { useIdolList } from '@/shared/hooks/useIdolList'
import { PageContainer } from '@/shared/Layout'

import { GroupInfoStep, emptyGroupForm, validateGroupInfo } from './components/steps/GroupInfoStep'
import type { GroupForm } from './components/steps/GroupInfoStep'
import { MembersStep, emptyMember, validateMembers } from './components/steps/MembersStep'
import type { EditableMember } from './components/steps/MembersStep'
import { SongsStep, SongsStepServices } from './components/steps/SongsStep'
import type { EditableSong } from './components/steps/SongsStep'
import { ExportStep } from './components/steps/ExportStep'
import type { ExportBundle } from './components/steps/ExportStep'

import type { GroupCategory, LanguageCode, MemberRole } from '@/shared/models'
import { GENDER_BY_CATEGORY, PARENT_ELIGIBLE_CATEGORIES } from '@/shared/constants'
import { slugify } from '@/shared/utils/slug'
import styles from './ContributorPage.module.scss'

const TABS = ['① Infos groupe', '② Membres', '③ Musiques', '④ Export']

export default function ContributorPage() {
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId?: string }>()
  const { data: groups } = useGroupList()
  const { data: idols } = useIdolList()

  const allGroups = groups ?? []
  const allIdols = idols ?? []
  const editGroup = groupId ? (allGroups.find((g) => g.id === groupId) ?? null) : null
  const isEdit = !!groupId

  const [step, setStep] = useState(0)
  const [stepErrors, setStepErrors] = useState<string[]>([])
  const [maxStep, setMaxStep] = useState(isEdit ? 3 : 0)
  const [bundle, setBundle] = useState<ExportBundle | null>(null)

  const [form, setForm] = useState<GroupForm>(() =>
    editGroup
      ? {
          id: editGroup.id,
          name: editGroup.name,
          category: editGroup.category,
          parentGroupId: editGroup.parentGroupId ?? '',
          generation: editGroup.generation as GroupForm['generation'],
          debutYear: String(editGroup.debutYear),
          status: editGroup.status,
          company: editGroup.company ?? '',
          coverImage: editGroup.coverImage ?? '',
          coverFile: null,
          fandomName: editGroup.fandomName ?? '',
          notes: editGroup.notes ?? '',
        }
      : emptyGroupForm(),
  )

  const idolMap = new Map(allIdols.map((i) => [i.id, i]))

  const [members, setMembers] = useState<EditableMember[]>(() => {
    if (!editGroup) return [emptyMember('current')]

    return editGroup.members.map((m) => {
      const idol = idolMap.get(m.idolId)
      return {
        _uiKey: Math.random().toString(36).slice(2),
        name: idol?.name ?? m.idolId,
        nationality: idol?.nationality ?? 'kr',
        roles: m.roles,
        portrait: idol?.portrait ?? '',
        portraitFile: null,
        status: m.status,
        resolutionMode: 'existing',
        existingIdolId: m.idolId,
        generatedId: m.idolId,
      }
    })
  })

  const [titles, setTitles] = useState<EditableSong[]>(() => {
    if (!editGroup) return [SongsStepServices.emptySong()]
    return editGroup.discography.titles.map((s) => ({
      _uiKey: Math.random().toString(36).slice(2),
      id: s.id,
      title: s.title,
      youtubeUrl: s.youtubeUrl ?? '',
      language: (s.language ?? '') as LanguageCode | '',
      isDebutSong: s.isDebutSong ?? false,
    }))
  })

  const [bSides, setBSides] = useState<EditableSong[]>(() => {
    if (!editGroup) return []
    return editGroup.discography.bSides.map((s) => ({
      _uiKey: Math.random().toString(36).slice(2),
      id: s.id,
      title: s.title,
      youtubeUrl: s.youtubeUrl ?? '',
      language: (s.language ?? '') as LanguageCode | '',
      isDebutSong: false,
    }))
  })

  const topLevelGroups = useMemo(
    () => allGroups.filter((g) => !g.parentGroupId && PARENT_ELIGIBLE_CATEGORIES.includes(g.category)),
    [allGroups],
  )

  const existingLabels = useMemo(
    () => [...new Set(allGroups.map((g) => g.company).filter(Boolean) as string[])].sort(),
    [allGroups],
  )

  const existingIdols = useMemo(
    () =>
      allIdols.map((idol) => ({
        id: idol.id,
        name: idol.name,
        nationality: idol.nationality ?? 'kr',
        portrait: idol.portrait ?? '',
        roles: [],
      })),
    [allIdols],
  )

  const parentGroup = topLevelGroups.find((g) => g.id === form.parentGroupId) ?? null
  const effectiveCategory: GroupCategory = parentGroup?.category ?? form.category
  const isSoloist = effectiveCategory === 'femaleSoloist' || effectiveCategory === 'maleSoloist'
  const isSubunit = !!form.parentGroupId

  function buildEditableMembersFromGroup() {
    if (!editGroup) return [emptyMember('current')]

    return editGroup.members.map((member) => {
      const idol = idolMap.get(member.idolId)
      return {
        _uiKey: Math.random().toString(36).slice(2),
        name: idol?.name ?? member.idolId,
        nationality: idol?.nationality ?? 'kr',
        roles: member.roles,
        portrait: idol?.portrait ?? '',
        portraitFile: null,
        status: member.status,
        resolutionMode: 'existing' as const,
        existingIdolId: member.idolId,
        generatedId: member.idolId,
      }
    })
  }

  const initializedEditGroupIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!groupId || !editGroup) return
    if (initializedEditGroupIdRef.current === groupId) return

    setForm({
      id: editGroup.id,
      name: editGroup.name,
      category: editGroup.category,
      parentGroupId: editGroup.parentGroupId ?? '',
      generation: editGroup.generation as GroupForm['generation'],
      debutYear: String(editGroup.debutYear),
      status: editGroup.status,
      company: editGroup.company ?? '',
      coverImage: editGroup.coverImage ?? '',
      coverFile: null,
      fandomName: editGroup.fandomName ?? '',
      notes: editGroup.notes ?? '',
    })

    setMembers(buildEditableMembersFromGroup())
    setTitles(editGroup.discography.titles.map((song) => ({
      _uiKey: Math.random().toString(36).slice(2),
      id: song.id,
      title: song.title,
      youtubeUrl: song.youtubeUrl ?? '',
      language: (song.language ?? '') as LanguageCode | '',
      isDebutSong: song.isDebutSong ?? false,
    })))
    setBSides(editGroup.discography.bSides.map((song) => ({
      _uiKey: Math.random().toString(36).slice(2),
      id: song.id,
      title: song.title,
      youtubeUrl: song.youtubeUrl ?? '',
      language: (song.language ?? '') as LanguageCode | '',
      isDebutSong: false,
    })))

    setMaxStep(3)
    initializedEditGroupIdRef.current = groupId
  }, [groupId, editGroup, idolMap])

  function makeDefaultMembersForStructure(nextCategory: GroupCategory, nextParentGroupId: string): EditableMember[] {
    const nextIsSoloist = nextCategory === 'femaleSoloist' || nextCategory === 'maleSoloist'
    const nextIsSubunit = nextParentGroupId.length > 0

    if (nextIsSubunit) return []
    if (nextIsSoloist) return [emptyMember('current')]
    return [emptyMember('current')]
  }

  function hasMeaningfulMembers(rows: EditableMember[]) {
    return rows.some(
      (m) =>
        !!m.name.trim() ||
        !!m.generatedId ||
        !!m.existingIdolId ||
        !!m.portrait ||
        !!m.portraitFile ||
        m.roles.length > 0,
    )
  }

  function handleStructureWillChange(next: { category: GroupCategory; parentGroupId: string }) {
    const sameCategory = next.category === form.category
    const sameParent = next.parentGroupId === form.parentGroupId
    if (sameCategory && sameParent) return true

    if (hasMeaningfulMembers(members)) {
      const ok = window.confirm(
        'Changer la catégorie ou le groupe parent va réinitialiser les membres déjà saisis. Continuer ?',
      )
      if (!ok) return false
    }

    setMembers(makeDefaultMembersForStructure(next.category, next.parentGroupId))
    setStepErrors([])
    setBundle(null)
    return true
  }

  function handleTabClick(i: number) {
    if (i > maxStep) return
    setStepErrors([])
    setStep(i)
  }

  function tryAdvance() {
    let errors: string[] = []
    if (step === 0) errors = validateGroupInfo(form, allGroups, isEdit)
    if (step === 1) errors = validateMembers(members, { isSoloist, isSubunit })
    if (step === 2) errors = SongsStepServices.validateSongs(titles, bSides)

    if (errors.length > 0) {
      setStepErrors(errors)
      return
    }

    setStepErrors([])
    const next = step + 1
    if (next > maxStep) setMaxStep(next)
    setStep(next)
  }

  function resolveExportRoles(member: EditableMember, isSoloistMember: boolean): MemberRole[] {
    if (!isSoloistMember) return [...member.roles]

    const roles: MemberRole[] = []

    if (member.roles.includes('vocal')) {
      roles.push('vocal', 'mainVocal')
    }

    if (member.roles.includes('rapper')) {
      roles.push('rapper', 'mainRapper')
    }

    return [...new Set(roles)]
  }

  function handleGenerate() {
    const gender = GENDER_BY_CATEGORY[effectiveCategory]

    const toSongEntry = (s: EditableSong) => ({
      id: s.id || slugify(s.title) + (s.language ? `-${s.language}` : ''),
      title: s.title,
      youtubeUrl: s.youtubeUrl,
      ...(s.language ? { language: s.language } : {}),
      ...(s.isDebutSong ? { isDebutSong: true } : {}),
    })

    const idolsBlock = members
      .filter((m) => m.resolutionMode === 'new')
      .map((m) => ({
        id: m.generatedId,
        name: m.name,
        primaryGroupId: form.id,
        gender,
        nationality: m.nationality,
        portrait: m.portrait ? `assets/idols/${m.generatedId}/portrait.webp` : null,
        notes: null,
        _file: m.portraitFile,
      }))

    const newLabels =
      form.company && !existingLabels.includes(form.company)
        ? [{ id: slugify(form.company), name: form.company, country: 'kr', logo: null }]
        : []

    const groupBlock = {
      id: form.id,
      name: form.name,
      category: effectiveCategory,
      parentGroupId: form.parentGroupId || null,
      generation: form.generation,
      debutYear: parseInt(form.debutYear),
      status: form.status,
      company: form.company || null,
      coverImage: form.coverImage ? `assets/groups/${form.id}/cover.webp` : null,
      members: members.map((m) => ({
        idolId: m.resolutionMode === 'existing' && m.existingIdolId ? m.existingIdolId : m.generatedId,
        status: m.status,
        roles: resolveExportRoles(m, isSoloist),
      })),
      discography: {
        titles: titles.filter((s) => s.title.trim()).map(toSongEntry),
        bSides: bSides.filter((s) => s.title.trim()).map(toSongEntry),
      },
      fandomName: form.fandomName || null,
      notes: form.notes || null,
    }

    const bundleData = {
      meta: {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
      },
      group: groupBlock,
      idols: idolsBlock.map(({ _file, ...idol }) => idol),
      newLabels,
    }

    const groupJson = JSON.stringify(bundleData, null, 2)

    setBundle({
      groupJson,
      groupId: form.id,
      coverFile: form.coverFile,
      memberAssets: idolsBlock.map(({ _file, id }) => ({
        idolId: id,
        file: _file,
      })),
      newLabels,
    })
  }

  return (
    <PageContainer>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>🎵 Proposer / Modifier un groupe</h1>
          <p className={styles.pageSubtitle}>
            Remplis ce formulaire pour soumettre un nouveau groupe ou corriger un groupe existant.
          </p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
          ← Retour
        </button>
      </div>

      {isEdit && editGroup && (
        <div className={styles.editBar}>
          ✏️ Mode édition — <strong>{editGroup.name}</strong>
        </div>
      )}

      <div className={styles.tabs}>
        {TABS.map((tab, i) => {
          const locked = i > maxStep
          const isActive = step === i
          return (
            <button
              key={tab}
              className={[styles.tab, isActive ? styles.tabActive : '', locked ? styles.tabLocked : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleTabClick(i)}
              disabled={locked}
              title={locked ? "Complète les étapes précédentes d'abord" : undefined}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {step === 0 && (
        <GroupInfoStep
          form={form}
          setForm={setForm}
          topLevelGroups={topLevelGroups}
          existingGroups={allGroups}
          existingLabels={existingLabels}
          isEdit={isEdit}
          errors={stepErrors}
          onStructureWillChange={handleStructureWillChange}
        />
      )}

      {step === 1 && (
        <MembersStep
          members={members}
          setMembers={setMembers}
          groupCategory={effectiveCategory}
          isSoloist={isSoloist}
          isSubunit={isSubunit}
          parentGroup={
            parentGroup
              ? {
                  id: parentGroup.id,
                  name: parentGroup.name,
                  members: parentGroup.members,
                }
              : null
          }
          existingIdols={existingIdols}
          errors={stepErrors}
        />
      )}

      {step === 2 && (
        <SongsStep
          titles={titles}
          setTitles={setTitles}
          bSides={bSides}
          setBSides={setBSides}
          isSubunit={isSubunit}
          isSoloist={isSoloist}
          errors={stepErrors}
        />
      )}

      {step === 3 && (
        <ExportStep
          form={form}
          members={members}
          titles={titles}
          bSides={bSides}
          bundle={bundle}
          onGenerate={handleGenerate}
          onBack={() => setStep(2)}
        />
      )}

      {step < 3 && (
        <div className={styles.stepNav}>
          {step > 0 && (
            <button
              className="btn btn--ghost"
              onClick={() => {
                setStepErrors([])
                setStep((s) => s - 1)
              }}
            >
              ← Retour
            </button>
          )}
          <div className={styles.stepNavSpacer} />
          <button className="btn btn--primary" onClick={tryAdvance}>
            Suivant →
          </button>
        </div>
      )}
    </PageContainer>
  )
}
