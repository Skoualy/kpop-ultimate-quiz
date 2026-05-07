/**
 * groupRotationService.ts
 *
 * Gestion de la rotation des groupes avec shuffle contraint au rebouclage.
 * Transverse à tous les modes de jeu (Save One, Blind Test…).
 *
 * Problème résolu : avec un nombre pair de groupes, les mêmes groupes
 * reviennent systématiquement pour chaque joueur en mode 2J.
 * Solution : quand tous les groupes ont été utilisés (rebouclage), l'ordre
 * est reshufflé avec la contrainte que chaque groupe change d'au moins D positions.
 */

import type { Group } from '@/shared/models'
import type { SongModeKey } from '@/features/save-one/helpers/songSessionMemory'

const STORAGE_PREFIX = 'kpq-group-order:'

function storageKey(mode: SongModeKey): string {
  return `${STORAGE_PREFIX}${mode}`
}

/** Fisher-Yates shuffle standard. */
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Shuffle contraint : chaque groupe doit changer d'au moins D positions
 * par rapport à son index dans prevOrder.
 * Fallback Fisher-Yates sans contrainte si aucune tentative valide en 150 essais.
 */
function constrainedShuffle(ids: string[], prevOrder: string[], D: number): string[] {
  const MAX_ATTEMPTS = 150
  const prevIndexMap = new Map(prevOrder.map((id, i) => [id, i]))

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = fisherYates(ids)
    const valid = candidate.every((id, newIdx) => {
      const prevIdx = prevIndexMap.get(id)
      return prevIdx === undefined || Math.abs(newIdx - prevIdx) >= D
    })
    if (valid) return candidate
  }
  return fisherYates(ids)
}

export const groupRotationService = {
  /**
   * Construit la file d'ordre des groupes pour une nouvelle partie.
   * Si prevOrder est fourni (fin d'un cycle précédent), applique un shuffle contraint.
   */
  buildGroupQueue(groups: Group[], itemsPerRound: number, prevOrder?: string[]): string[] {
    const ids = groups.map((g) => g.id)
    if (!prevOrder || prevOrder.length === 0) return fisherYates(ids)
    const D = Math.max(itemsPerRound, Math.floor(ids.length / 2))
    return constrainedShuffle(ids, prevOrder, D)
  },

  saveGroupOrder(mode: SongModeKey, order: string[]): void {
    try {
      sessionStorage.setItem(storageKey(mode), JSON.stringify(order))
    } catch { /* sessionStorage indisponible */ }
  },

  loadGroupOrder(mode: SongModeKey): string[] | null {
    try {
      const raw = sessionStorage.getItem(storageKey(mode))
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as string[]) : null
    } catch {
      return null
    }
  },
}
