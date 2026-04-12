import { useState, useEffect, useMemo, useRef } from 'react'
import { ContributorStep } from '@/features/contributor/components/ContributorStep'
import { ImagePickerControl } from '@/shared/Controls/ImagePickerControl'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PARENT_ELIGIBLE_CATEGORIES,
  GENERATIONS,
  GENERATION_LABELS,
  debutYearToGeneration,
} from '@/shared/constants'
import { slugify } from '@/shared/utils/slug'
import type { Group, GroupCategory, GroupStatus, Generation } from '@/shared/models'
import type { GroupForm } from './GroupInfoStep.types'
import styles from './GroupInfoStep.module.scss'
import { GeneratedIdInputControl } from '@/shared/Controls/GeneratedIdInputControl'
import { resolveGroupCover } from '@/shared/utils/placeholder'

export function validateGroupInfo(form: GroupForm, existingGroups: Group[], isEdit: boolean): string[] {
  const errors: string[] = []
  if (!form.name.trim()) errors.push('Le nom du groupe est requis')
  else if (!isEdit && existingGroups.some((g) => g.id === form.id))
    errors.push(`Un groupe avec l'ID "${form.id}" existe déjà`)

  const year = parseInt(form.debutYear)
  if (!form.debutYear || isNaN(year) || year < 1990 || year > new Date().getFullYear()) {
    errors.push("L'année de début est requise (ex: 2015)")
  }

  if (!form.generation) errors.push('La génération est requise')
  if (!form.company.trim()) errors.push('Le label / agence principale est requis')

  return errors
}

interface GroupInfoStepProps {
  form: GroupForm
  setForm: React.Dispatch<React.SetStateAction<GroupForm>>
  topLevelGroups: Group[]
  existingGroups: Group[]
  existingLabels: string[]
  isEdit: boolean
  errors?: string[]
  onStructureWillChange?: (next: { category: GroupCategory; parentGroupId: string }) => boolean
}

export function GroupInfoStep({
  form,
  setForm,
  topLevelGroups,
  existingGroups,
  existingLabels,
  isEdit,
  errors,
  onStructureWillChange,
}: GroupInfoStepProps) {
  const upd = <K extends keyof GroupForm>(k: K, v: GroupForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const [genManual, setGenManual] = useState(isEdit)

  useEffect(() => {
    if (genManual) return
    const year = parseInt(form.debutYear)
    if (!isNaN(year) && year >= 1990) {
      upd('generation', debutYearToGeneration(year))
    }
  }, [form.debutYear, genManual])

  const parentGroup = useMemo(
    () => topLevelGroups.find((g) => g.id === form.parentGroupId) ?? null,
    [topLevelGroups, form.parentGroupId],
  )

  useEffect(() => {
    if (parentGroup && form.category !== parentGroup.category) {
      upd('category', parentGroup.category)
    }
  }, [parentGroup?.id])

  const isSoloist = form.category === 'femaleSoloist' || form.category === 'maleSoloist'

  useEffect(() => {
    if (isSoloist && form.parentGroupId) {
      upd('parentGroupId', '')
    }
  }, [isSoloist])

  const [showLabelDrop, setShowLabelDrop] = useState(false)
  const labelRef = useRef<HTMLDivElement>(null)

  const labelSuggestions = useMemo(() => {
    if (!form.company || form.company.length < 1) return []
    return existingLabels.filter((l) => l.toLowerCase().includes(form.company.toLowerCase())).slice(0, 6)
  }, [form.company, existingLabels])

  const isNewLabel =
    form.company.length > 0 && !existingLabels.find((l) => l.toLowerCase() === form.company.toLowerCase())

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) setShowLabelDrop(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function applyCategoryChange(nextCategory: GroupCategory) {
    const nextParentGroupId =
      nextCategory === 'femaleSoloist' || nextCategory === 'maleSoloist' ? '' : form.parentGroupId

    if (nextCategory === form.category && nextParentGroupId === form.parentGroupId) return

    const ok = onStructureWillChange?.({ category: nextCategory, parentGroupId: nextParentGroupId }) ?? true
    if (!ok) return

    setForm((prev) => ({
      ...prev,
      category: nextCategory,
      parentGroupId: nextParentGroupId,
    }))
  }

  function applyParentGroupChange(nextParentGroupId: string) {
    const derivedCategory =
      nextParentGroupId.length > 0
        ? (topLevelGroups.find((g) => g.id === nextParentGroupId)?.category ?? form.category)
        : form.category

    if (nextParentGroupId === form.parentGroupId && derivedCategory === form.category) return

    const ok =
      onStructureWillChange?.({
        category: derivedCategory,
        parentGroupId: nextParentGroupId,
      }) ?? true

    if (!ok) return

    setForm((prev) => ({
      ...prev,
      parentGroupId: nextParentGroupId,
      category: derivedCategory,
    }))
  }

  return (
    <ContributorStep errors={errors}>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Informations générales</p>

        <div className={styles.mainLayout}>
          <div className={styles.coverCol}>
            <ImagePickerControl
              label="Cover du groupe"
              value={form.coverImage}
              placeholderImage={resolveGroupCover({ coverImage: form.coverImage })}
              onChange={(v) => upd('coverImage', v)}
              onFileChange={(f) => upd('coverFile', f)}
              aspectRatio="1/1"
              hint="600x600 px · webp"
              emptyIcon="🎵"
            />
          </div>

          <div className={styles.fieldsCol}>
            <div className={styles.grid2}>
              <div className={styles.field}>
                {isEdit ? (
                  <>
                    <label className={styles.label}>
                      Nom du groupe <span className={styles.required}>*</span>
                    </label>
                    <input
                      className="input"
                      value={form.name}
                      placeholder="Ex: TWICE"
                      onChange={(e) => upd('name', e.target.value)}
                    />
                    <span className={styles.infoMsg}>ID verrouillé en édition : {form.id}</span>
                  </>
                ) : (
                  <GeneratedIdInputControl
                    label="Nom du groupe"
                    required
                    value={form.name}
                    onChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        name: value,
                        id: slugify(value),
                      }))
                    }
                    generatedId={form.id}
                    exists={existingGroups.some((g) => g.id === form.id)}
                    placeholder="Ex: TWICE"
                  />
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Statut <span className={styles.required}>*</span>
                </label>
                <select
                  className="select"
                  value={form.status}
                  onChange={(e) => upd('status', e.target.value as GroupStatus)}
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Catégorie <span className={styles.required}>*</span>
                </label>
                <select
                  className="select"
                  value={form.category}
                  disabled={isEdit || !!parentGroup}
                  onChange={(e) => applyCategoryChange(e.target.value as GroupCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                {parentGroup && <span className={styles.infoMsg}>✦ Catégorie forcée depuis le groupe parent</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} style={{ opacity: isSoloist ? 0.45 : 1 }}>
                  Sub-unit de <span className={styles.hint}>— laisser vide si indépendant</span>
                </label>
                <select
                  className="select"
                  value={isSoloist ? '' : form.parentGroupId}
                  disabled={isEdit || isSoloist}
                  style={{ opacity: isSoloist ? 0.4 : 1 }}
                  onChange={(e) => applyParentGroupChange(e.target.value)}
                >
                  <option value="">— Aucun (groupe indépendant)</option>
                  {[...topLevelGroups]
                    .filter((g) => PARENT_ELIGIBLE_CATEGORIES.includes(g.category))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Année de début <span className={styles.required}>*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  min={1990}
                  max={new Date().getFullYear()}
                  value={form.debutYear}
                  placeholder="Ex: 2015"
                  onChange={(e) => upd('debutYear', e.target.value)}
                  disabled={isEdit}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Génération <span className={styles.required}>*</span>
                  {!genManual && form.generation && <span className={styles.genAutoTag}>auto</span>}
                </label>
                <select
                  className="select"
                  value={form.generation}
                  onChange={(e) => {
                    setGenManual(true)
                    upd('generation', e.target.value as Generation)
                  }}
                  disabled={isEdit}
                >
                  <option value="">— Sélectionner</option>
                  {GENERATIONS.map((g) => (
                    <option key={g} value={g}>
                      {GENERATION_LABELS[g]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>
                  Agence principale <span className={styles.required}>*</span>
                </label>
                <div className={styles.autocompleteWrap} ref={labelRef}>
                  <input
                    className="input"
                    value={form.company}
                    placeholder="Ex: JYP Entertainment"
                    onChange={(e) => {
                      upd('company', e.target.value)
                      setShowLabelDrop(true)
                    }}
                    onFocus={() => setShowLabelDrop(true)}
                  />
                  {showLabelDrop && labelSuggestions.length > 0 && (
                    <div className={styles.autocompleteDropdown}>
                      {labelSuggestions.map((l) => (
                        <div
                          key={l}
                          className={styles.autocompleteItem}
                          onMouseDown={() => {
                            upd('company', l)
                            setShowLabelDrop(false)
                          }}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {isNewLabel && form.company && (
                  <span className={styles.warnMsg}>✦ Nouvelle agence — sera ajoutée automatiquement</span>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Nom de la fandom</label>
                <input
                  className="input"
                  value={form.fandomName}
                  placeholder="Ex: ONCE"
                  onChange={(e) => upd('fandomName', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={[styles.field, styles.notesField].join(' ')}>
          <label className={styles.label}>Notes</label>
          <textarea
            className={['input', styles.textarea].join(' ')}
            value={form.notes}
            placeholder="Informations complémentaires, contexte, sources…"
            onChange={(e) => upd('notes', e.target.value)}
          />
        </div>
      </div>
    </ContributorStep>
  )
}
