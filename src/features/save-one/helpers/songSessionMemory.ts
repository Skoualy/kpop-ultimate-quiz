/**
 * songSessionMemory.ts
 *
 * Mémoire de rotation pondérée des musiques par session navigateur.
 * Stockée en sessionStorage — durée de vie = onglet courant uniquement.
 *
 * Règle absolue :
 *   `lastTimestamp` est TOUJOURS l'une des 3 valeurs canoniques : 60 | 90 | 120.
 *   Jamais de valeur dérivée ou de "playbackStart" technique.
 *
 * Formule du poids :
 *   - Jamais vue dans cette session → 1.0
 *   - Déjà vue → 0.5 + floor(roundsSinceSeen / 10) × 0.1, plafonné à 1.0
 */

import { CANONICAL_TIMESTAMPS, pickCanonicalTimestamp } from './timestampHelper'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SongModeKey = 'saveOne-songs' | 'blindTest-songs'

export interface SongMemoryEntry {
  /** Round session où la musique a été vue pour la dernière fois */
  lastRound: number
  /** Dernier baseTimestamp canonique utilisé — TOUJOURS 60 | 90 | 120 */
  lastTimestamp: number
}

export interface SongSessionMemory {
  /** Rounds cumulés joués dans ce mode pour la session courante */
  nbRounds: number
  entries: Record<string, SongMemoryEntry>
}

// ─── sessionStorage ───────────────────────────────────────────────────────────

const PREFIX = 'kpq-song-session:'

function storageKey(mode: SongModeKey): string { return `${PREFIX}${mode}` }
function emptyMemory(): SongSessionMemory { return { nbRounds: 0, entries: {} } }

export function getSongSessionMemory(mode: SongModeKey): SongSessionMemory {
  try {
    const raw = sessionStorage.getItem(storageKey(mode))
    if (!raw) return emptyMemory()
    const parsed = JSON.parse(raw) as SongSessionMemory
    if (typeof parsed?.nbRounds !== 'number' || typeof parsed?.entries !== 'object') {
      return emptyMemory()
    }
    return parsed
  } catch {
    return emptyMemory()
  }
}

function saveSongSessionMemory(mode: SongModeKey, memory: SongSessionMemory): void {
  try {
    sessionStorage.setItem(storageKey(mode), JSON.stringify(memory))
  } catch {
    // sessionStorage indisponible ou plein — silencieux
  }
}

/**
 * Incrémente nbRounds au début d'un round.
 * À appeler juste avant de tirer les items du round.
 */
export function incrementSongSessionRound(mode: SongModeKey): SongSessionMemory {
  const memory  = getSongSessionMemory(mode)
  const updated = { ...memory, nbRounds: memory.nbRounds + 1 }
  saveSongSessionMemory(mode, updated)
  return updated
}

// ─── Poids ────────────────────────────────────────────────────────────────────

/**
 * Calcule dynamiquement le poids d'une chanson.
 * Le poids N'EST JAMAIS stocké en session.
 */
export function computeSongWeight(songId: string, memory: SongSessionMemory): number {
  const entry = memory.entries[songId]
  if (!entry) return 1.0
  const roundsSinceSeen = memory.nbRounds - entry.lastRound
  return Math.min(1.0, 0.5 + Math.floor(roundsSinceSeen / 10) * 0.1)
}

// ─── Timestamp canonique mémorisé ────────────────────────────────────────────

/**
 * Retourne le dernier baseTimestamp canonique d'une chanson.
 * Valide la canonicité au moment de la lecture — retourne undefined si invalide.
 */
export function getLastCanonicalTimestamp(
  songId: string,
  memory: SongSessionMemory,
): number | undefined {
  const entry = memory.entries[songId]
  if (!entry) return undefined
  // Vérification : valeur stockée doit être canonique
  return (CANONICAL_TIMESTAMPS as readonly number[]).includes(entry.lastTimestamp)
    ? entry.lastTimestamp
    : undefined
}

// ─── Tirage pondéré ───────────────────────────────────────────────────────────

/**
 * Tirage aléatoire pondéré direct.
 * Pas de filtre post-tirage, pas de reroll conditionnel.
 */
export function weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
  if (items.length === 0) throw new Error('weightedPick: liste vide')
  if (items.length === 1) return items[0]

  const total = items.reduce((s, item) => s + getWeight(item), 0)
  let rnd = Math.random() * total
  for (const item of items) {
    rnd -= getWeight(item)
    if (rnd <= 0) return item
  }
  return items[items.length - 1]  // garde-fou float
}

/**
 * Tirage pondéré sans remise pour un round entier.
 * Aucune chanson ne peut apparaître deux fois dans le même round.
 */
export function weightedPickUnique<T>(
  items: T[],
  count: number,
  getWeight: (item: T) => number,
): T[] {
  const available = [...items]
  const picked: T[] = []
  const n = Math.min(count, available.length)
  for (let i = 0; i < n; i++) {
    const item = weightedPick(available, getWeight)
    picked.push(item)
    available.splice(available.indexOf(item), 1)
  }
  return picked
}

// ─── Mise à jour après round ──────────────────────────────────────────────────

/**
 * Met à jour la mémoire après un round.
 *
 * IMPORTANT : `baseTimestamp` doit être une valeur canonique (60 | 90 | 120).
 * Ne jamais passer un `playbackStart` ajusté ou une valeur dérivée.
 * La fonction valide et corrige automatiquement si nécessaire.
 */
export function updateSongMemoryAfterRound(
  mode: SongModeKey,
  pickedSongs: Array<{ songId: string; baseTimestamp: number }>,
): void {
  const memory         = getSongSessionMemory(mode)
  const updatedEntries = { ...memory.entries }

  for (const { songId, baseTimestamp } of pickedSongs) {
    // Validation stricte : garantir la canonicité avant stockage
    const canonicalTs = (CANONICAL_TIMESTAMPS as readonly number[]).includes(baseTimestamp)
      ? baseTimestamp
      : pickCanonicalTimestamp()  // fallback si valeur non canonique reçue

    updatedEntries[songId] = {
      lastRound:     memory.nbRounds,
      lastTimestamp: canonicalTs,
    }
  }

  saveSongSessionMemory(mode, { ...memory, entries: updatedEntries })
}
