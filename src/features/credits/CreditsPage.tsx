import { useEffect, useState } from 'react'
import type { AssetCredit, CreditsDataset } from '@/shared/models/AssetCredit'
import styles from './CreditsPage.module.scss'

// ─── Helper ───────────────────────────────────────────────────────────────────

function ValidationBadge({ credit }: { credit: AssetCredit }) {
  const { validation } = credit
  if (validation.isValid) {
    return <span className={[styles.badge, styles.badgeOk].join(' ')}>✓ Valide</span>
  }
  if (validation.status === 'manual_review_required') {
    return <span className={[styles.badge, styles.badgeWarn].join(' ')}>⚠ Revue requise</span>
  }
  return <span className={[styles.badge, styles.badgeError].join(' ')}>✗ Invalide</span>
}

function SourceBadge({ type }: { type: AssetCredit['sourceType'] }) {
  return (
    <span className={[
      styles.badge,
      type === 'wikimedia' ? styles.badgeWikimedia :
      type === 'official'  ? styles.badgeOfficial  : styles.badgeUnknown,
    ].join(' ')}>
      {type === 'wikimedia' ? '🌐 Wikimedia' : type === 'official' ? '🏢 Officielle' : '❓ Inconnue'}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const [dataset, setDataset] = useState<CreditsDataset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'idol' | 'group'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/dataset/credits.json')
      .then((r) => {
        if (!r.ok) throw new Error('credits.json introuvable')
        return r.json() as Promise<CreditsDataset>
      })
      .then(setDataset)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => setIsLoading(false))
  }, [])

  const credits = dataset?.credits ?? []

  const filtered = credits.filter((c) => {
    if (filter !== 'all' && c.entityType !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        c.entityId.includes(q) ||
        c.author?.toLowerCase().includes(q) ||
        c.originalFileName?.toLowerCase().includes(q) ||
        c.license?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const validCount   = credits.filter((c) => c.validation.isValid).length
  const invalidCount = credits.filter((c) => !c.validation.isValid).length

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Crédits images</h1>
          <p className={styles.subtitle}>
            Sources et licences de toutes les images utilisées dans K-Pop Ultimate Quiz.
          </p>
        </div>
        {!isLoading && dataset && (
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{credits.length}</span>
              <span className={styles.statLabel}>images</span>
            </div>
            <div className={styles.stat}>
              <span className={[styles.statValue, styles.statOk].join(' ')}>{validCount}</span>
              <span className={styles.statLabel}>valides</span>
            </div>
            {invalidCount > 0 && (
              <div className={styles.stat}>
                <span className={[styles.statValue, styles.statErr].join(' ')}>{invalidCount}</span>
                <span className={styles.statLabel}>à vérifier</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && <p className={styles.center}>Chargement…</p>}
      {error   && <p className={styles.center} style={{ color: 'var(--color-danger)' }}>{error}</p>}

      {/* Filters */}
      {!isLoading && !error && (
        <div className={styles.filters}>
          <input
            className="input"
            placeholder="Rechercher (entité, auteur, licence…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          {(['all', 'idol', 'group'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={['btn', filter === f ? 'btn--primary' : 'btn--secondary', 'btn--sm'].join(' ')}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Tout' : f === 'idol' ? 'Idoles' : 'Groupes'}
            </button>
          ))}
        </div>
      )}

      {/* Credits table */}
      {!isLoading && !error && (
        <div className={styles.tableWrap}>
          {filtered.length === 0 ? (
            <p className={styles.center}>Aucun crédit trouvé.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Entité</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Auteur</th>
                  <th>Licence</th>
                  <th>Statut</th>
                  <th>Attribution</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((credit) => (
                  <tr key={credit.id} className={credit.validation.isValid ? '' : styles.rowInvalid}>
                    <td>
                      <code className={styles.entityId}>{credit.entityId}</code>
                      <span className={styles.entityType}>{credit.entityType}</span>
                    </td>
                    <td>
                      <span className={styles.assetType}>{credit.assetType}</span>
                    </td>
                    <td>
                      <SourceBadge type={credit.sourceType} />
                      {credit.sourceUrl && (
                        <a
                          href={credit.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.link}
                        >
                          ↗
                        </a>
                      )}
                    </td>
                    <td className={styles.author}>
                      {credit.author ?? <span className={styles.missing}>—</span>}
                    </td>
                    <td>
                      {credit.license ? (
                        credit.licenseUrl ? (
                          <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                            {credit.license}
                          </a>
                        ) : (
                          <span>{credit.license}</span>
                        )
                      ) : (
                        <span className={styles.missing}>—</span>
                      )}
                    </td>
                    <td><ValidationBadge credit={credit} /></td>
                    <td className={styles.attribution}>
                      {credit.attribution ?? <span className={styles.missing}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Last updated */}
      {dataset && (
        <p className={styles.lastUpdated}>
          Dernière mise à jour : {new Date(dataset.meta.lastUpdated).toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  )
}
