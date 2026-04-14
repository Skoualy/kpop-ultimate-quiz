import { useMemo, useState } from 'react'
import { ContributorStep } from '@/features/contributor/components/ContributorStep'
import { PaginationControl } from '@/shared/Components/PaginationControl'
import { CollapsibleSection } from '@/shared/Components/CollapsibleSection'
import { ScrollTopControl } from '@/shared/Controls/ScrollTopControl'
import { BadgeGroupControl } from '@/shared/Controls/BadgeGroupControl'
import { SelectNationalityControl } from '@/shared/Controls/SelectNationalityControl'
import { ImagePickerControl } from '@/shared/Controls/ImagePickerControl'
import { GeneratedIdInputControl } from '@/shared/Controls/GeneratedIdInputControl'
import { ROLES, ROLE_LABELS } from '@/shared/constants'
import { slugify } from '@/shared/utils/slug'
import type { MemberRole, NationalityCode, GroupCategory } from '@/shared/models'
import {
  EditableMember,
  emptyMember,
  resetMember,
  buildUniqueIdolId,
  getMemberPlaceholderByCategory,
} from './MembersStep.types'
import styles from './MembersStep.module.scss'

const MEMBER_PAGE_SIZES = [10, 15, 20, 25, 30]
type MemberZone = 'current' | 'former'

interface ExistingIdolOption {
  id: string
  name: string
  nationality: NationalityCode
  portrait?: string | null
  roles?: MemberRole[]
}

interface MembersStepProps {
  members: EditableMember[]
  setMembers: React.Dispatch<React.SetStateAction<EditableMember[]>>
  groupCategory: GroupCategory
  isSoloist: boolean
  isSubunit: boolean
  parentGroup?: { id: string; name: string; members: { idolId: string; roles: MemberRole[] }[] } | null
  existingIdols: ExistingIdolOption[]
  isEdit: boolean
  errors?: string[]
}

interface MemberConflict {
  uiKey: string
  memberName: string
  matchId: string
  matchName: string
}

export function MembersStep({
  members,
  setMembers,
  isSoloist,
  isSubunit,
  parentGroup,
  groupCategory,
  existingIdols,
  isEdit,
  errors,
}: MembersStepProps) {
  const current = members.filter((m) => m.status === 'current')
  const former = members.filter((m) => m.status === 'former')
  const showFormer = !isSoloist && !isSubunit

  const [selectedParentIds, setSelectedParentIds] = useState<string[]>(
    isSubunit ? (members.map((m) => m.existingIdolId).filter(Boolean) as string[]) : [],
  )

  const [dismissedConflicts, setDismissedConflicts] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [formerPage, setFormerPage] = useState(1)
  const [dragging, setDragging] = useState<{ key: string; from: MemberZone } | null>(null)

  function update(uiKey: string, patch: Partial<EditableMember>) {
    setMembers((prev) => {
      const next = prev.map((m) => (m._uiKey === uiKey ? { ...m, ...patch } : m))
      const updated = next.find((m) => m._uiKey === uiKey)
      if (!updated) return next

      const hasLeader = updated.roles.includes('leader')
      const hasMaknae = updated.roles.includes('maknae')

      return next.map((member) => {
        if (member._uiKey === uiKey) return member
        const roles = member.roles.filter((role) => {
          if (role === 'leader' && hasLeader) return false
          if (role === 'maknae' && hasMaknae) return false
          return true
        })
        return roles.length === member.roles.length ? member : { ...member, roles }
      })
    })
  }

  function resetSoloist(uiKey: string) {
    setMembers((prev) => prev.map((m) => (m._uiKey === uiKey ? resetMember(m) : m)))
    setDismissedConflicts((prev) => {
      const next = { ...prev }
      delete next[uiKey]
      return next
    })
  }

  function updateName(uiKey: string, value: string) {
    setMembers((prev) =>
      prev.map((m) => {
        if (m._uiKey !== uiKey) return m

        if (isEdit) {
          const reservedIds = [
            ...existingIdols.map((i) => i.id),
            ...prev
              .filter((x) => x._uiKey !== uiKey)
              .map((x) => (x.resolutionMode === 'existing' && x.existingIdolId ? x.existingIdolId : x.generatedId))
              .filter(Boolean),
          ]

          return {
            ...m,
            name: value,
            generatedId: m.generatedId || buildUniqueIdolId(value, reservedIds),
          }
        }

        const matchedExisting =
          value.trim().length > 1 ? existingIdols.find((i) => slugify(i.name) === slugify(value)) : null

        const currentlyReusedMatch =
          m.resolutionMode === 'existing' && m.existingIdolId
            ? existingIdols.find((i) => i.id === m.existingIdolId)
            : null

        const stillSameExisting =
          !!matchedExisting && !!currentlyReusedMatch && matchedExisting.id === currentlyReusedMatch.id

        const reservedIds = [
          ...existingIdols.map((i) => i.id),
          ...prev
            .filter((x) => x._uiKey !== uiKey)
            .map((x) => (x.resolutionMode === 'existing' && x.existingIdolId ? x.existingIdolId : x.generatedId))
            .filter(Boolean),
        ]

        return {
          ...m,
          name: value,
          resolutionMode: stillSameExisting ? 'existing' : 'new',
          existingIdolId: stillSameExisting ? m.existingIdolId : null,
          generatedId: stillSameExisting ? (currentlyReusedMatch?.id ?? '') : buildUniqueIdolId(value, reservedIds),
        }
      }),
    )

    setDismissedConflicts((prev) => {
      const next = { ...prev }
      delete next[uiKey]
      return next
    })
  }

  function remove(uiKey: string) {
    setMembers((prev) => prev.filter((m) => m._uiKey !== uiKey))
    if (isSubunit) {
      const member = members.find((m) => m._uiKey === uiKey)
      const idolId = member?.existingIdolId
      if (idolId) setSelectedParentIds((prev) => prev.filter((id) => id !== idolId))
    }
  }

  function addMember(status: 'current' | 'former') {
    setMembers((prev) => [emptyMember(status), ...prev])
  }

  function moveDraggedMember(to: MemberZone, overKey?: string) {
    if (!dragging) return
    const sourceList = dragging.from === 'current' ? current : former
    const targetList = to === 'current' ? current : former
    const draggedMember = sourceList.find((member) => member._uiKey === dragging.key)
    if (!draggedMember) return

    const nextSource = sourceList.filter((member) => member._uiKey !== dragging.key)
    const targetWithoutDragged = dragging.from === to ? nextSource : targetList
    const insertIndex = overKey ? targetWithoutDragged.findIndex((member) => member._uiKey === overKey) : -1

    const nextTargetMember = { ...draggedMember, status: to }
    const nextTarget = [...targetWithoutDragged]
    if (insertIndex >= 0) nextTarget.splice(insertIndex, 0, nextTargetMember)
    else nextTarget.push(nextTargetMember)

    const merged = [
      ...(to === 'current' ? nextTarget : nextSource),
      ...(to === 'former' ? nextTarget : nextSource),
    ]
    setMembers(merged)
  }

  function resolveConflictAsExisting(conflict: MemberConflict) {
    const match = existingIdols.find((i) => i.id === conflict.matchId)

    setMembers((prev) =>
      prev.map((m) =>
        m._uiKey === conflict.uiKey
          ? {
              ...m,
              name: match?.name ?? conflict.matchName,
              resolutionMode: 'existing',
              existingIdolId: conflict.matchId,
              generatedId: conflict.matchId,
              nationality: match?.nationality ?? 'kr',
              portrait: match?.portrait ?? '',
              portraitFile: null,
            }
          : m,
      ),
    )
  }

  function resolveConflictAsNew(conflict: MemberConflict) {
    setMembers((prev) =>
      prev.map((m) => {
        if (m._uiKey !== conflict.uiKey) return m

        const reservedIds = [
          ...existingIdols.map((i) => i.id),
          ...prev
            .filter((x) => x._uiKey !== conflict.uiKey)
            .map((x) => (x.resolutionMode === 'existing' && x.existingIdolId ? x.existingIdolId : x.generatedId))
            .filter(Boolean),
        ]

        return {
          ...m,
          resolutionMode: 'new',
          existingIdolId: null,
          generatedId: buildUniqueIdolId(m.name, reservedIds),
        }
      }),
    )

    setDismissedConflicts((prev) => ({
      ...prev,
      [conflict.uiKey]: conflict.matchId,
    }))
  }

  function findSectionConflict(sectionMembers: EditableMember[]): MemberConflict | null {
    for (const member of sectionMembers) {
      const rawName = member.name.trim()
      if (rawName.length <= 1) continue

      const match = existingIdols.find((i) => slugify(i.name) === slugify(rawName))
      if (!match) continue

      const alreadyResolvedAsExisting = member.resolutionMode === 'existing' && member.existingIdolId === match.id
      const dismissedForThisMatch = dismissedConflicts[member._uiKey] === match.id

      if (!alreadyResolvedAsExisting && !dismissedForThisMatch) {
        return {
          uiKey: member._uiKey,
          memberName: rawName,
          matchId: match.id,
          matchName: match.name,
        }
      }
    }

    return null
  }

  const currentConflict = useMemo(() => (isEdit ? null : findSectionConflict(current)), [current, existingIdols, dismissedConflicts, isEdit])
  const formerConflict = useMemo(() => (isEdit ? null : findSectionConflict(former)), [former, existingIdols, dismissedConflicts, isEdit])
  const query = search.trim().toLowerCase()
  const filteredCurrent = current.filter((member) => !query || member.name.toLowerCase().includes(query))
  const filteredFormer = former.filter((member) => !query || member.name.toLowerCase().includes(query))
  const pagedCurrent = filteredCurrent.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const pagedFormer = filteredFormer.slice((formerPage - 1) * pageSize, formerPage * pageSize)

  if (isSubunit && parentGroup) {
    const parentMemberOptions = parentGroup.members.map((m) => {
      const idol = existingIdols.find((i) => i.id === m.idolId)
      return {
        value: m.idolId,
        label: idol?.name ?? m.idolId,
      }
    })

    return (
      <ContributorStep errors={errors}>
        <div className={styles.subunitPicker}>
          <div className={styles.subunitTitle}>Membres de {parentGroup.name}</div>
          <div className={styles.subunitHint}>
            Sélectionne les membres qui participent à cette sub-unit. Les rôles seront hérités du groupe principal.
          </div>
          <BadgeGroupControl
            options={parentMemberOptions}
            selectedBadges={selectedParentIds}
            onChange={(ids) => {
              const newMembers: EditableMember[] = ids.map((id) => {
                const existing = members.find((m) => m.resolutionMode === 'existing' && m.existingIdolId === id)
                if (existing) return existing

                const idol = existingIdols.find((i) => i.id === id)
                return {
                  _uiKey: `existing-${id}`,
                  name: idol?.name ?? id,
                  nationality: idol?.nationality ?? 'kr',
                  roles: [],
                  portrait: idol?.portrait ?? '',
                  portraitFile: null,
                  status: 'current' as const,
                  resolutionMode: 'existing' as const,
                  existingIdolId: id,
                  generatedId: id,
                }
              })

              setMembers(newMembers)
              setSelectedParentIds(ids)
            }}
            isMultiselect
            size="md"
          />
        </div>
      </ContributorStep>
    )
  }

  return (
    <ContributorStep errors={errors}>
      <div className={styles.topToolbar}>
        <input
          className="input"
          value={search}
          placeholder="Rechercher un membre..."
          onChange={(e) => {
            setSearch(e.target.value)
            setCurrentPage(1)
            setFormerPage(1)
          }}
        />
        <label className={styles.pageSizeInline}>
          <span>Par page</span>
          <select className={['select', styles.pageSizeSelect].join(' ')} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
            {MEMBER_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>

      {currentConflict && (
        <div className={styles.reuseBox}>
          <span>L&apos;idol <strong>{currentConflict.memberName}</strong> existe déjà. Réutiliser ou créer un nouveau ?</span>
          <div className={styles.reuseActions}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => resolveConflictAsExisting(currentConflict)}>Réutiliser</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => resolveConflictAsNew(currentConflict)}>Nouveau</button>
          </div>
        </div>
      )}

      <CollapsibleSection
        title="Membres actuels"
        subtitle={!isSoloist ? 'au moins deux requis' : undefined}
        actions={!isSoloist ? <button type="button" className="btn btn--secondary btn--sm" onClick={() => addMember('current')}>+ Ajouter</button> : undefined}
      >
        <div className={styles.hint}>💡 Utilise les rôles pour améliorer la qualité du quiz (leader/maknae uniques).</div>
        <div className={styles.sectionList} onDragOver={(e) => e.preventDefault()} onDrop={() => moveDraggedMember('current')}>
          {pagedCurrent.map((m) => (
            <MemberCard
              key={m._uiKey}
              member={m}
              onUpdate={(p) => update(m._uiKey, p)}
              onNameChange={(value) => updateName(m._uiKey, value)}
              onRemove={() => remove(m._uiKey)}
              onReset={() => resetSoloist(m._uiKey)}
              isSoloist={isSoloist}
              isSubunit={isSubunit}
              groupCategory={groupCategory}
              isEdit={isEdit}
              onDropOnCard={() => moveDraggedMember('current', m._uiKey)}
              onDragStart={() => setDragging({ key: m._uiKey, from: 'current' })}
              onDragEnd={() => setDragging(null)}
            />
          ))}
        </div>

        {filteredCurrent.length > 10 && (
          <PaginationControl
            currentPage={currentPage}
            totalItems={filteredCurrent.length}
            pageSize={pageSize}
            showPageSize={false}
            pageSizeOptions={MEMBER_PAGE_SIZES}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </CollapsibleSection>

      {showFormer && (
        <CollapsibleSection
          title="Anciens membres"
          subtitle="optionnel"
          actions={<button type="button" className="btn btn--ghost btn--sm" onClick={() => addMember('former')}>+ Ajouter</button>}
        >
          {formerConflict && (
            <div className={styles.reuseBox}>
              <span>L&apos;idol <strong>{formerConflict.memberName}</strong> existe déjà. Réutiliser ou créer un nouveau ?</span>
              <div className={styles.reuseActions}>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => resolveConflictAsExisting(formerConflict)}>Réutiliser</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => resolveConflictAsNew(formerConflict)}>Nouveau</button>
              </div>
            </div>
          )}

          <div className={styles.sectionList} onDragOver={(e) => e.preventDefault()} onDrop={() => moveDraggedMember('former')}>
            {pagedFormer.map((m) => (
              <MemberCard
                key={m._uiKey}
                member={m}
                onUpdate={(p) => update(m._uiKey, p)}
                onNameChange={(value) => updateName(m._uiKey, value)}
                onRemove={() => remove(m._uiKey)}
                onReset={() => resetSoloist(m._uiKey)}
                isSoloist={isSoloist}
                isSubunit={isSubunit}
                groupCategory={groupCategory}
                isEdit={isEdit}
                hideRemoveButton
                onDropOnCard={() => moveDraggedMember('former', m._uiKey)}
                onDragStart={() => setDragging({ key: m._uiKey, from: 'former' })}
                onDragEnd={() => setDragging(null)}
              />
            ))}
          </div>

          {filteredFormer.length > 10 && (
            <PaginationControl
              currentPage={formerPage}
              totalItems={filteredFormer.length}
              pageSize={pageSize}
              showPageSize={false}
              pageSizeOptions={MEMBER_PAGE_SIZES}
              onPageChange={setFormerPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </CollapsibleSection>
      )}

      <ScrollTopControl />
    </ContributorStep>
  )
}

interface MemberCardProps {
  member: EditableMember
  onUpdate: (patch: Partial<EditableMember>) => void
  onNameChange: (value: string) => void
  onRemove: () => void
  onReset: () => void
  isSoloist: boolean
  isSubunit: boolean
  groupCategory: GroupCategory
  isEdit: boolean
  hideRemoveButton?: boolean
  onDropOnCard: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function MemberCard({
  member,
  onUpdate,
  onNameChange,
  onRemove,
  onReset,
  isSoloist,
  isSubunit,
  groupCategory,
  isEdit,
  hideRemoveButton,
  onDropOnCard,
  onDragStart,
  onDragEnd,
}: MemberCardProps) {
  const isExistingMember = member.resolutionMode === 'existing' && !!member.existingIdolId
  const memberPlaceholderImage = getMemberPlaceholderByCategory(groupCategory)
  const classicRoleOptions = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))
  const soloistRoleOptions: { value: MemberRole; label: string }[] = [
    { value: 'vocal', label: 'Vocal' },
    { value: 'rapper', label: 'Rapper' },
  ]

  const roleOptions = isSoloist ? soloistRoleOptions : classicRoleOptions
  const lockIdentityFields = isExistingMember
  const lockPortrait = isSubunit

  return (
    <div className={styles.dragRow} onDragOver={(e) => e.preventDefault()} onDrop={onDropOnCard}>
      <div className={styles.dragHandle} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} title="Glisser-déposer">⋮⋮</div>
      <div className={styles.card}>
        <div className={styles.cardBody}>
          <div className={styles.cardPortrait}>
            <ImagePickerControl
              value={member.portrait}
              placeholderImage={memberPlaceholderImage}
              onChange={(v) => onUpdate({ portrait: v })}
              onFileChange={(f) => onUpdate({ portraitFile: f })}
              aspectRatio="400/533"
              hint="400×533 px"
              emptyIcon="👤"
              disabled={lockPortrait}
            />
          </div>

          <div className={styles.cardRight}>
            <div className={styles.row2}>
              <div className={styles.field}>
                {isEdit ? (
                  <>
                    <label className={styles.label}>Nom de scène <span className={styles.required}>*</span></label>
                    <input className="input" value={member.name} placeholder="Ex: Sana" onChange={(e) => onNameChange(e.target.value)} />
                    <span className={styles.requiredSmall}>ID verrouillé : {member.generatedId || member.existingIdolId || '—'}</span>
                  </>
                ) : (
                  <GeneratedIdInputControl
                    label="Nom de scène"
                    required
                    value={member.name}
                    onChange={onNameChange}
                    generatedId={member.resolutionMode === 'existing' && member.existingIdolId ? member.existingIdolId : member.generatedId}
                    exists={false}
                    placeholder="Ex: Sana"
                    disabled={lockIdentityFields}
                  />
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Nationalité</label>
                <SelectNationalityControl
                  value={member.nationality}
                  onChange={(v: NationalityCode) => onUpdate({ nationality: v })}
                  disabled={false}
                />
              </div>
            </div>

            {!isSubunit && (
              <div className={styles.field}>
                <label className={styles.label}>
                  {isSoloist ? 'Rôle' : 'Rôles'} <span className={styles.required}>*</span>{' '}
                  {!isSoloist && <span className={styles.requiredSmall}>(au moins un)</span>}
                </label>
                <BadgeGroupControl<MemberRole>
                  options={roleOptions}
                  selectedBadges={member.roles}
                  onChange={(roles) => onUpdate({ roles: roles as MemberRole[] })}
                  isMultiselect
                  size="sm"
                />
              </div>
            )}
          </div>

          {isSoloist ? (
            <div className={styles.cardDeleteRow}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>↺ Reset</button>
            </div>
          ) : !hideRemoveButton ? (
            <div className={styles.cardDeleteRow}>
              <button type="button" className="btn btn--danger btn--sm" onClick={onRemove}>🗑 Supprimer</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
