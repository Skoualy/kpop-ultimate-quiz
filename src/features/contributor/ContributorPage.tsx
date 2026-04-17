import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGroupList } from '@/shared/hooks/useGroupList'
import { useIdolList } from '@/shared/hooks/useIdolList'
import { PageContainer } from '@/shared/Layout'
import { DraftBundleControl } from '@/shared/Controls/DraftBundleControl'

import { GroupInfoStep, emptyGroupForm, validateGroupInfo } from './components/steps/GroupInfoStep'
import type { GroupForm } from './components/steps/GroupInfoStep'
import { MembersStep, emptyMember, validateMembers } from './components/steps/MembersStep'
import type { EditableMember } from './components/steps/MembersStep'
import { SongsStep, SongsStepServices } from './components/steps/SongsStep'
import type { EditableSong } from './components/steps/SongsStep'
import { ExportStep } from './components/steps/ExportStep'
import type { ExportBundle } from './components/steps/ExportStep'

import type { GroupCategory, LanguageCode, MemberRole } from '@/shared/models'
import type { BundleCreditEntry } from '@/shared/models/BundleCreditEntry'
import { GENDER_BY_CATEGORY, PARENT_ELIGIBLE_CATEGORIES } from '@/shared/constants'
import { slugify } from '@/shared/utils/slug'
import { getGroupCoverPath, getIdolPortraitPath } from '@/shared/utils/assets'
import styles from './ContributorPage.module.scss'

const TABS = ['① Infos groupe', '② Membres', '③ Musiques', '④ Export']

interface ContributorDraft {
  form: GroupForm
  members: EditableMember[]
  titles: EditableSong[]
  bSides: EditableSong[]
  savedAt: string
}

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
          coverCredit: { sourceType: 'wikimedia' as const, originalFileName: null, transformReport: null },
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
        portraitCredit: { sourceType: 'wikimedia' as const, originalFileName: null, transformReport: null },
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
        portraitCredit: { sourceType: 'wikimedia' as const, originalFileName: null, transformReport: null },
      }
    })
  }

  const initializedEditGroupIdRef = useRef<string | null>(null)

  const previousGroupIdRef = useRef<string | undefined>(groupId)

  useEffect(() => {
    const cameFromEditRoute = !!previousGroupIdRef.current && !groupId
    if (cameFromEditRoute) {
      setForm(emptyGroupForm())
      setMembers([emptyMember('current')])
      setTitles([SongsStepServices.emptySong()])
      setBSides([])
      setBundle(null)
      setStepErrors([])
      setStep(0)
      setMaxStep(0)
      initializedEditGroupIdRef.current = null
    }

    previousGroupIdRef.current = groupId
  }, [groupId])

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
      coverCredit: { sourceType: 'wikimedia' as const, originalFileName: null, transformReport: null },
    })

    setMembers(buildEditableMembersFromGroup())
    setTitles(
      editGroup.discography.titles.map((song) => ({
        _uiKey: Math.random().toString(36).slice(2),
        id: song.id,
        title: song.title,
        youtubeUrl: song.youtubeUrl ?? '',
        language: (song.language ?? '') as LanguageCode | '',
        isDebutSong: song.isDebutSong ?? false,
      })),
    )
    setBSides(
      editGroup.discography.bSides.map((song) => ({
        _uiKey: Math.random().toString(36).slice(2),
        id: song.id,
        title: song.title,
        youtubeUrl: song.youtubeUrl ?? '',
        language: (song.language ?? '') as LanguageCode | '',
        isDebutSong: false,
      })),
    )

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

  function validateStep(currentStep: number): string[] {
    if (currentStep === 0) return validateGroupInfo(form, allGroups, isEdit)
    if (currentStep === 1) return validateMembers(members, { isSoloist, isSubunit })
    if (currentStep === 2) return SongsStepServices.validateSongs(titles, bSides)
    return []
  }

  function handleTabClick(nextStep: number) {
    if (nextStep === step) return

    const errors = validateStep(step)
    if (errors.length > 0) {
      setStepErrors(errors)
      return
    }

    setStepErrors([])
    if (nextStep > maxStep) setMaxStep(nextStep)
    setStep(nextStep)
  }

  function tryAdvance() {
    const errors = validateStep(step)

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

  function buildCredits(
    groupId: string,
    coverImage: string,
    coverCredit: GroupForm['coverCredit'],
    normalizedMembersList: EditableMember[],
    idolsBlockList: Array<{ id: string; portrait: string | null }>,
  ): BundleCreditEntry[] {
    const credits: BundleCreditEntry[] = []

    if (coverImage && coverCredit) {
      credits.push({ entityType: 'group', entityId: groupId, assetType: 'cover', creditInput: coverCredit })
    }

    for (const idol of idolsBlockList) {
      const member = normalizedMembersList.find(
        (m) => (m.resolutionMode === 'existing' && m.existingIdolId === idol.id) || m.generatedId === idol.id,
      )
      if (member?.portrait && member.portraitCredit && idol.id) {
        credits.push({
          entityType: 'idol',
          entityId: idol.id,
          assetType: 'portrait',
          creditInput: member.portraitCredit,
        })
      }
    }

    return credits
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

    const normalizedMembers = [...members].sort((a, b) => {
      const aLeader = a.roles.includes('leader') ? 0 : 1
      const bLeader = b.roles.includes('leader') ? 0 : 1
      return aLeader - bLeader
    })

    const idolsBlock = normalizedMembers.map((m) => ({
      id: m.resolutionMode === 'existing' && m.existingIdolId ? m.existingIdolId : m.generatedId,
      name: m.name,
      primaryGroupId: form.id,
      gender,
      nationality: m.nationality,
      portrait: m.portrait
        ? getIdolPortraitPath(m.resolutionMode === 'existing' && m.existingIdolId ? m.existingIdolId : m.generatedId)
        : null,
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
      coverImage: form.coverImage ? getGroupCoverPath(form.id) : null,
      members: normalizedMembers.map((m) => ({
        idolId: m.resolutionMode === 'existing' && m.existingIdolId ? m.existingIdolId : m.generatedId,
        status: m.status,
        roles: resolveExportRoles(m, isSoloist),
      })),
      discography: {
        titles: SongsStepServices.sortSongsForExport(titles).map(toSongEntry),
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
      credits: buildCredits(form.id, form.coverImage, form.coverCredit, normalizedMembers, idolsBlock),
    }

    const groupJson = JSON.stringify(bundleData, null, 2)

    setBundle({
      groupJson,
      groupId: form.id,
      coverFile: form.coverFile,
      coverSource: form.coverImage || '',
      memberAssets: idolsBlock.map(({ _file, id, portrait }) => ({
        idolId: id,
        file: _file,
        source: portrait ?? '',
      })),
      newLabels,
    })
  }

  async function downloadDraft() {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    const sortedMembers = [...members].sort(
      (a, b) => Number(b.roles.includes('leader')) - Number(a.roles.includes('leader')),
    )
    const sortedTitles = SongsStepServices.sortSongsForExport(titles)

    const draft: ContributorDraft = {
      form,
      members: sortedMembers,
      titles: sortedTitles,
      bSides,
      savedAt: new Date().toISOString(),
    }

    zip.file('draft.json', JSON.stringify(draft, null, 2))

    async function appendAssetFromPath(targetPath: string, sourcePath: string) {
      try {
        const response = await fetch(sourcePath)
        if (!response.ok) return
        const blob = await response.blob()
        zip.file(targetPath, blob)
      } catch {
        // ignore missing external assets in draft export
      }
    }

    if (form.coverFile) {
      zip.file(`assets/groups/${form.id}/cover.webp`, form.coverFile)
    } else if (form.coverImage) {
      await appendAssetFromPath(`assets/groups/${form.id}/cover.webp`, form.coverImage)
    }

    for (const member of sortedMembers) {
      const idolId = member.existingIdolId || member.generatedId
      if (!idolId) continue

      if (member.portraitFile) {
        zip.file(`assets/idols/${idolId}/portrait.webp`, member.portraitFile)
      } else if (member.portrait) {
        await appendAssetFromPath(`assets/idols/${idolId}/portrait.webp`, member.portrait)
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${form.id || 'group'}-draft.zip`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  async function loadDraft(file: File) {
    try {
      const isZip = file.name.toLowerCase().endsWith('.zip')

      if (!isZip) {
        const raw = await file.text()
        const draft = JSON.parse(raw) as ContributorDraft
        setForm(draft.form)
        setMembers(draft.members)
        setTitles(draft.titles)
        setBSides(draft.bSides)
        setBundle(null)
        setStepErrors([])
        setStep(0)
        setMaxStep(0)
        return
      }

      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      const draftFile = zip.file('draft.json')
      if (!draftFile) throw new Error('draft.json manquant')

      const draft = JSON.parse(await draftFile.async('string')) as ContributorDraft
      const nextForm = { ...draft.form }
      const nextMembers = [...draft.members]

      const coverZipPath = `assets/groups/${nextForm.id}/cover.webp`
      const coverZipFile = zip.file(coverZipPath)
      if (coverZipFile) {
        const coverBlob = await coverZipFile.async('blob')
        const coverFile = new File([coverBlob], 'cover.webp', { type: coverBlob.type || 'image/webp' })
        nextForm.coverFile = coverFile
        nextForm.coverImage = URL.createObjectURL(coverBlob)
      }

      for (let i = 0; i < nextMembers.length; i += 1) {
        const member = nextMembers[i]
        const idolId = member.existingIdolId || member.generatedId
        if (!idolId) continue

        const portraitZipPath = `assets/idols/${idolId}/portrait.webp`
        const portraitZipFile = zip.file(portraitZipPath)
        if (!portraitZipFile) continue

        const portraitBlob = await portraitZipFile.async('blob')
        nextMembers[i] = {
          ...member,
          portraitFile: new File([portraitBlob], 'portrait.webp', { type: portraitBlob.type || 'image/webp' }),
          portrait: URL.createObjectURL(portraitBlob),
        }
      }

      setForm(nextForm)
      setMembers(nextMembers)
      setTitles(draft.titles)
      setBSides(draft.bSides)
      setBundle(null)
      setStepErrors([])
      setStep(0)
      setMaxStep(0)
    } catch {
      setStepErrors(['Le fichier draft est invalide ou corrompu'])
    }
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
        <div className={styles.headerTools}>
          <DraftBundleControl onFileSelect={loadDraft} />
          <button className="btn btn--secondary btn--sm" onClick={downloadDraft}>
            💾 Sauvegarder en brouillon
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
            ← Retour
          </button>
        </div>
      </div>

      {isEdit && editGroup && (
        <div className={styles.editBar}>
          ✏️ Mode édition — <strong>{editGroup.name}</strong>
        </div>
      )}

      <div className={styles.tabs}>
        {TABS.map((tab, i) => {
          const isActive = step === i
          return (
            <button
              key={tab}
              className={[styles.tab, isActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => handleTabClick(i)}
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
          isEdit={isEdit}
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
          onSaveDraft={downloadDraft}
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
              ← Précédent
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
