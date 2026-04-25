import type { EntityId } from './EntityAutoSuggest.types'

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Normalise une chaîne pour la recherche :
 * - minuscules
 * - suppression des diacritiques (accents)
 */
export function normalizeQuery(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// ─── Filtre par défaut ────────────────────────────────────────────────────────

/**
 * Filtre les entités selon une query.
 * - Insensible à la casse et aux accents
 * - Recherche dans label, id et meta
 * - Les résultats qui commencent par la query sont prioritaires
 */
export function defaultFilterEntities<T>(
  items: T[],
  query: string,
  accessors: {
    getId:    (item: T) => string
    getLabel: (item: T) => string
    getMeta?: (item: T) => string | undefined
  },
): T[] {
  const q = normalizeQuery(query.trim())
  if (!q) return []

  const starts: T[] = []
  const contains: T[] = []

  for (const item of items) {
    const label  = normalizeQuery(accessors.getLabel(item))
    const id     = normalizeQuery(accessors.getId(item))
    const meta   = accessors.getMeta ? normalizeQuery(accessors.getMeta(item) ?? '') : ''

    const matchLabel   = label.includes(q)
    const matchId      = id.includes(q)
    const matchMeta    = !!meta && meta.includes(q)
    const anyMatch     = matchLabel || matchId || matchMeta

    if (!anyMatch) continue

    // Priorité : commence par la query dans le label
    if (label.startsWith(q)) {
      starts.push(item)
    } else {
      contains.push(item)
    }
  }

  return [...starts, ...contains]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Filtre les items déjà sélectionnés de la liste.
 */
export function filterOutSelected<T>(
  items: T[],
  selectedIds: EntityId[],
  getId: (item: T) => EntityId,
): T[] {
  if (selectedIds.length === 0) return items
  const set = new Set(selectedIds)
  return items.filter((item) => !set.has(getId(item)))
}
