import type { Group } from '@/shared/models'
import type { SongModeKey } from '@/features/save-one/helpers/songSessionMemory'

// Group rotation keys — extends SongModeKey with idols mode
export type GroupRotationKey = SongModeKey | 'blindTest-idols'

const STORAGE_PREFIX = 'kpq-group-order:'
const MAX_SHUFFLE_ATTEMPTS = 150

function storageKey(mode: GroupRotationKey): string {
  return `${STORAGE_PREFIX}${mode}`
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Shuffles group IDs ensuring each group moves at least D positions from its previous index.
function constrainedShuffle(ids: string[], prevOrder: string[], D: number): string[] {
  const prevIndexOf = new Map(prevOrder.map((id, i) => [id, i]))

  for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
    const candidate = fisherYates(ids)
    const valid = candidate.every((id, newIdx) => {
      const prev = prevIndexOf.get(id)
      return prev === undefined || Math.abs(newIdx - prev) >= D
    })
    if (valid) return candidate
  }

  return fisherYates(ids) // fallback — no constraint guarantee
}

export const groupRotationService = {
  /**
   * Returns an ordered list of group IDs for the next game cycle.
   * On first call (no prevOrder): simple Fisher-Yates.
   * On cycle end: constrained shuffle to avoid repeating patterns.
   */
  buildGroupQueue(groups: Group[], itemsPerRound: number, prevOrder?: string[]): string[] {
    const ids = groups.map((g) => g.id)
    if (!prevOrder || prevOrder.length === 0) return fisherYates(ids)
    const D = Math.max(itemsPerRound, Math.floor(groups.length / 2))
    return constrainedShuffle(ids, prevOrder, D)
  },

  saveGroupOrder(mode: GroupRotationKey, order: string[]): void {
    try {
      sessionStorage.setItem(storageKey(mode), JSON.stringify(order))
    } catch {
      // sessionStorage unavailable — silent
    }
  },

  loadGroupOrder(mode: GroupRotationKey): string[] | null {
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
