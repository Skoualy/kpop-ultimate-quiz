import { useState } from 'react'
import { ContributorStep } from '@/features/contributor/components/ContributorStep'
import type { EditableMember } from '../MembersStep/MembersStep.types'
import type { EditableSong } from '../SongsStep/SongsStep.types'
import type { GroupForm } from '../GroupInfoStep/GroupInfoStep.types'
import { NATIONALITY_LABELS, ROLE_LABELS, GENERATION_LABELS, ROLES } from '@/shared/constants'
import type { MemberRole, NationalityCode, Generation } from '@/shared/models'
import styles from './ExportStep.module.scss'
import JSZip from 'jszip'

export interface ExportBundle {
  groupJson: string
  groupId: string
  coverFile: File | null
  memberAssets: { idolId: string; file: File | null }[]
  newLabels: { id: string; name: string; country: string; logo: null }[]
}

interface ExportStepProps {
  form: GroupForm
  members: EditableMember[]
  titles: EditableSong[]
  bSides: EditableSong[]
  bundle: ExportBundle | null
  onGenerate: () => void
  onBack: () => void
  onSaveDraft: () => void
}

export async function readJsonFromZip(zip: JSZip, path: string) {
  const file = zip.file(path)
  if (!file) return null
  const text = await file.async('string')
  return JSON.parse(text)
}

export function ExportStep({ form, members, titles, bSides, bundle, onGenerate, onBack, onSaveDraft }: ExportStepProps) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadZip() {
    if (!bundle) return
    setDownloading(true)
    try {
      // Import dynamique de JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // bundle.json
      zip.file('bundle.json', bundle.groupJson)
      zip.file(
        'draft.json',
        JSON.stringify(
          {
            form,
            members,
            titles,
            bSides,
            savedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      )

      // Cover groupe
      if (bundle.coverFile) {
        zip.file(`assets/groups/${bundle.groupId}/cover.webp`, bundle.coverFile)
      }

      // Portraits membres
      for (const { idolId, file } of bundle.memberAssets) {
        if (file) zip.file(`assets/idols/${idolId}/portrait.webp`, file)
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `${bundle.groupId}.zip`,
      })
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error('ZIP error:', err)
    } finally {
      setDownloading(false)
    }
  }

  const current = members.filter((m) => m.status === 'current')
  const former = members.filter((m) => m.status === 'former')
  const debutSongsCount = titles.filter((song) => song.title.trim() && song.isDebutSong).length
  const rolesNotAssigned = ROLES.filter((role) => !members.some((member) => member.roles.includes(role)))

  const warningMessages: string[] = []
  if (!form.fandomName.trim()) warningMessages.push('Nom de fandom non renseigné')
  if (rolesNotAssigned.length > 0) warningMessages.push(`Rôles non attribués : ${rolesNotAssigned.map((role) => ROLE_LABELS[role]).join(', ')}`)
  if (debutSongsCount === 0) warningMessages.push('Aucune chanson de début n\'a été attribuée')

  return (
    <ContributorStep>
      <div className={styles.wrapper}>
        {warningMessages.length > 0 && (
          <div className={styles.warningCard}>
            <div className={styles.warningTitle}>⚠ Vérifications recommandées</div>
            {warningMessages.map((message) => (
              <div key={message} className={styles.warningItem}>• {message}</div>
            ))}
          </div>
        )}

        {/* ── Résumé scrollable ── */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryTitle}>Vérifier avant export</div>
          <div className={styles.summaryScroll}>
            {/* Section 1 : Infos groupe */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>① Infos groupe</div>
              <Row k="Nom" v={form.name || '—'} />
              <Row k="ID" v={form.id || '—'} />
              <Row k="Catégorie" v={form.category} />
              <Row k="Statut" v={form.status === 'active' ? 'Actif' : 'Inactif'} />
              {form.parentGroupId && <Row k="Sub-unit de" v={form.parentGroupId} />}
              <Row k="Génération" v={form.generation ? GENERATION_LABELS[form.generation as Generation] : '—'} />
              <Row k="Début" v={form.debutYear || '—'} />
              <Row k="Label" v={form.company || '—'} />
              {form.fandomName && <Row k="Fandom" v={form.fandomName} />}
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Cover</span>
                <span className={styles.summaryVal}>{form.coverImage ? '✅ Image déclarée (existence à vérifier)' : '⚠️ Aucune image'}</span>
              </div>
            </div>

            {/* Section 2 : Membres */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                ② Membres ({current.length} actuel{current.length > 1 ? 's' : ''}
                {former.length > 0 ? `, ${former.length} ancien${former.length > 1 ? 's' : ''}` : ''})
              </div>
              {[...current, ...former].map((m) => (
                <div key={m._uiKey} className={styles.memberRow}>
                  <span className={styles.memberName}>{m.name || '—'}</span>
                  <span className={styles.memberMeta}>
                    {NATIONALITY_LABELS[m.nationality as NationalityCode]}
                    {m.roles.length > 0 && ` · ${m.roles.map((r) => ROLE_LABELS[r as MemberRole]).join(', ')}`}
                    {m.status === 'former' && ' · ancien'}
                  </span>
                  <span className={styles.memberPortrait}>{m.portrait ? '🖼 portrait déclaré' : '⚠️ portrait manquant'}</span>
                </div>
              ))}
            </div>

            {/* Section 3 : Musiques */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                ③ Musiques ({titles.length} title{titles.length > 1 ? 's' : ''}
                {bSides.length > 0 ? `, ${bSides.length} b-side${bSides.length > 1 ? 's' : ''}` : ''})
              </div>
              {titles.map((s) => (
                <div key={s._uiKey} className={styles.songRow}>
                  <span className={styles.songTitle}>{s.title || '—'}</span>
                  <span className={styles.songMeta}>
                    {s.isDebutSong && '⭐ debut · '}
                    {s.language ? s.language.toUpperCase() : 'KR'}
                  </span>
                </div>
              ))}
              {bSides.map((s) => (
                <div key={s._uiKey} className={styles.songRow}>
                  <span className={styles.songTitle}>{s.title || '—'}</span>
                  <span className={styles.songMeta}>b-side · {s.language ? s.language.toUpperCase() : 'KR'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.actionsCard}>
          <div className={styles.actionsTitle}>Télécharger & envoyer</div>
          <p className={styles.actionsDesc}>
            Le ZIP contiendra le bundle JSON, la cover du groupe et les portraits des membres. Envoie-le à
            l'administrateur pour intégration.
          </p>
          {bundle && <div className={styles.zipReady}>✅ Bundle prêt — {bundle.groupId}.zip</div>}
          <div className={styles.actionsRow}>
            <button className="btn btn--primary" onClick={onGenerate}>
              ⚡ {bundle ? 'Regénérer' : 'Générer le bundle'}
            </button>
            <button className="btn btn--secondary" onClick={handleDownloadZip} disabled={!bundle || downloading}>
              {downloading ? '⏳ Compression…' : '↓ Télécharger le ZIP'}
            </button>
            <button className="btn btn--ghost" onClick={onBack}>
              ✏️ Modifier
            </button>
            <button className="btn btn--secondary" onClick={onSaveDraft}>
              💾 Sauvegarder en brouillon
            </button>
          </div>
        </div>
      </div>
    </ContributorStep>
  )
}

// ─── Helper row ───────────────────────────────────────────────────────────────
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryKey}>{k}</span>
      <span className={styles.summaryVal}>{v}</span>
    </div>
  )
}
