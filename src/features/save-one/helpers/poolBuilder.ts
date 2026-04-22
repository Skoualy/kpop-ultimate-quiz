/**
 * poolBuilder.ts
 *
 * Construction de rounds avec garantie d'intégrité absolue :
 *
 *   1. Aucun round ne contient moins d'items que choicesPerRound (jamais dégradé)
 *   2. Aucun doublon d'item dans un round
 *   3. Si un groupe qui contribuait initialement s'épuise → STOP immédiat
 *   4. Fair Group Queue : les groupes les moins récemment vus ont priorité
 *   5. Timestamps canoniques uniquement (60 | 90 | 120)
 *   6. Chansons : tirage pondéré selon la session mémoire
 *
 * Si un round complet ne peut pas être construit → on s'arrête sans
 * jamais générer de round dégradé ou incomplet.
 */

import type { Group, Idol, MemberRole, SaveOneCriterion } from '@/shared/models'
import type { IdolItem, RoundData, SongItem } from '../SaveOnePage.types'
import { pickCanonicalTimestamp } from './timestampHelper'
import { extractYouTubeId, getYouTubeThumbnail } from './youtubeHelpers'
import { resolveEffectiveRoles } from './poolSizeEstimator'
import {
  type SongSessionMemory,
  type SongModeKey,
  computeSongWeight,
  weightedPickUnique,
  getLastCanonicalTimestamp,
} from './songSessionMemory'

// ─── Shuffle ─────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Critères aléatoires ─────────────────────────────────────────────────────

const RANDOM_CRITERIA: SaveOneCriterion[] = ['beauty', 'personality', 'voice', 'performance']

export function pickRandomCriterion(): SaveOneCriterion {
  return RANDOM_CRITERIA[Math.floor(Math.random() * RANDOM_CRITERIA.length)]
}

// ─── Idol pool ────────────────────────────────────────────────────────────────

interface IdolPoolFilters {
  roleFilters: MemberRole[]
  criterion:   SaveOneCriterion
}

export function buildIdolPool(
  groups: Group[],
  allIdols: Idol[],
  filters: IdolPoolFilters,
): IdolItem[] {
  const idolMap = new Map<string, Idol>(allIdols.map((i) => [i.id, i]))
  const seen    = new Set<string>()
  const pool: IdolItem[] = []

  const effectiveRoles = resolveEffectiveRoles(filters.criterion, filters.roleFilters)

  for (const group of groups) {
    for (const member of group.members) {
      const idol = idolMap.get(member.idolId)
      if (!idol || seen.has(idol.id)) continue
      if (effectiveRoles.length > 0 && !member.roles.some((r) => effectiveRoles.includes(r))) continue

      seen.add(idol.id)
      pool.push({
        type:      'idol',
        idolId:    idol.id,
        name:      idol.name,
        groupId:   group.id,
        groupName: group.name,
        portrait:  idol.portrait ?? null,
        isFormer:  member.status === 'former',
        roles:     member.roles,
      })
    }
  }

  // Pas de mélange global — Fair Queue gère l'ordre entre groupes
  return pool
}

// ─── Song pool ───────────────────────────────────────────────────────────────

type SongType = 'all' | 'titles' | 'bSides' | 'debutSongs'

interface SongPoolFilters {
  songType:     SongType
  clipDuration: number
}

/**
 * Construit le pool brut de chansons.
 * Le timestamp est un placeholder canonique qui SERA remplacé lors du tirage
 * par le timestamp alternatif calculé via la session mémoire.
 */
export function buildSongPool(groups: Group[], filters: SongPoolFilters): SongItem[] {
  const pool: SongItem[] = []

  for (const group of groups) {
    const { discography } = group
    let songs = [...discography.titles, ...discography.bSides]

    if (filters.songType === 'titles')       songs = discography.titles
    else if (filters.songType === 'bSides')  songs = discography.bSides
    else if (filters.songType === 'debutSongs') songs = discography.titles.filter((s) => s.isDebutSong)

    for (const song of songs) {
      const youtubeId = extractYouTubeId(song.youtubeUrl)
      if (!youtubeId) continue

      // Timestamp provisoire canonique — remplacé au moment du tirage
      const startTime = pickCanonicalTimestamp()
      const endTime   = startTime + filters.clipDuration

      pool.push({
        type:         'song',
        songId:       song.id,
        title:        song.title,
        groupId:      group.id,
        groupName:    group.name,
        youtubeId,
        thumbnailUrl: getYouTubeThumbnail(youtubeId),
        startTime,
        endTime,
      })
    }
  }

  return pool
}

// ─── Fair Group Queue ─────────────────────────────────────────────────────────

/**
 * Distribue K slots entre les groupes selon leur priorité LRU.
 * Round-robin à partir du groupe le moins récemment utilisé.
 */
function allocateGroupSlots(
  groupStats: Array<{ groupId: string; lastRoundUsed: number }>,
  K: number,
): Map<string, number> {
  if (groupStats.length === 0) return new Map()

  // Tri stable : lastRoundUsed croissant, aléatoire pour les ex-aequo
  const sorted = [...groupStats].sort((a, b) => {
    if (a.lastRoundUsed !== b.lastRoundUsed) return a.lastRoundUsed - b.lastRoundUsed
    return Math.random() - 0.5
  })

  const slots = new Map<string, number>()
  for (const g of sorted) slots.set(g.groupId, 0)

  // Distribution round-robin
  for (let i = 0; i < K; i++) {
    const group = sorted[i % sorted.length]
    slots.set(group.groupId, (slots.get(group.groupId) ?? 0) + 1)
  }

  return slots
}

// ─── Round builder ────────────────────────────────────────────────────────────

interface RoundConfig {
  totalRounds:  number
  dropCount:    number
  criterion:    SaveOneCriterion
  clipDuration: number
}

/**
 * Génère tous les rounds avec garantie stricte d'intégrité.
 *
 * Règles de STOP (aucun round dégradé ne sera jamais ajouté) :
 *   1. Pool total insuffisant (totalAvailable < K)
 *   2. Un groupe qui contribuait au départ s'épuise (composition cassée)
 *   3. Un groupe ne peut pas fournir ses slots alloués
 *   4. Vérification finale : roundItems.length < K
 *
 * Le nombre de rounds produit peut être inférieur à config.totalRounds.
 * C'est normal et attendu : buildRounds ne dégénère jamais.
 */
export function buildRounds(
  rawPool: IdolItem[] | SongItem[],
  config: RoundConfig,
  songMemory?: SongSessionMemory,
  _songModeKey?: SongModeKey,
): RoundData[] {
  if (rawPool.length === 0) return []

  const K       = config.dropCount + 1
  const isSongs = rawPool[0]?.type === 'song'

  // ── Initialisation des queues par groupe ──────────────────────────────────

  const groupAvailable = new Map<string, (IdolItem | SongItem)[]>()
  const groupLastUsed  = new Map<string, number>()

  for (const item of rawPool) {
    const gid = item.groupId
    if (!groupAvailable.has(gid)) {
      groupAvailable.set(gid, [])
      groupLastUsed.set(gid, 0)
    }
    groupAvailable.get(gid)!.push(item)
  }

  // Mélanger chaque queue de groupe individuellement
  for (const [gid, items] of groupAvailable) {
    groupAvailable.set(gid, shuffle(items))
  }

  // Nombre initial de groupes avec des items — seuil de composition attendue
  const initialGroupCount = [...groupAvailable.values()].filter((items) => items.length > 0).length

  // ── Génération des rounds ─────────────────────────────────────────────────

  const rounds: RoundData[] = []

  for (let r = 0; r < config.totalRounds; r++) {

    // [STOP 1] — Groupes disponibles (avec items)
    const availableGroups = [...groupAvailable.entries()]
      .filter(([, items]) => items.length > 0)
      .map(([groupId]) => ({ groupId, lastRoundUsed: groupLastUsed.get(groupId) ?? 0 }))

    // [STOP 2] — Si un groupe qui contribuait s'est épuisé → composition cassée → stop
    if (availableGroups.length < initialGroupCount) break

    // [STOP 3] — Total insuffisant
    const totalAvailable = availableGroups.reduce(
      (s, g) => s + (groupAvailable.get(g.groupId)?.length ?? 0), 0
    )
    if (totalAvailable < K) break

    // Allocation slots via Fair Queue
    const slotsMap = allocateGroupSlots(availableGroups, K)

    // [STOP 4] — Vérification préalable : chaque groupe peut honorer ses slots
    let roundFeasible = true
    for (const [groupId, slotCount] of slotsMap) {
      if (slotCount === 0) continue
      const available = groupAvailable.get(groupId)
      if (!available || available.length < slotCount) {
        roundFeasible = false
        break
      }
    }
    if (!roundFeasible) break

    // ── Construction du round ─────────────────────────────────────────────

    const roundItems: (IdolItem | SongItem)[] = []

    for (const [groupId, slotCount] of slotsMap) {
      if (slotCount === 0) continue
      const available = groupAvailable.get(groupId)!

      if (isSongs && songMemory) {
        // Tirage pondéré par session pour les chansons
        const picked = weightedPickUnique(
          available,
          slotCount,
          (item) => computeSongWeight((item as SongItem).songId, songMemory),
        )

        for (const song of picked as SongItem[]) {
          // Timestamp canonique alternatif — évite le dernier utilisé
          const lastTs    = getLastCanonicalTimestamp(song.songId, songMemory)
          const startTime = pickCanonicalTimestamp(lastTs)  // baseTimestamp canonique
          const endTime   = startTime + config.clipDuration

          roundItems.push({ ...song, startTime, endTime })
          available.splice(available.indexOf(song), 1)
        }
      } else {
        // Idoles : tirage séquentiel (queue déjà mélangée par groupe)
        const picked = available.splice(0, slotCount)
        roundItems.push(...picked)
      }

      groupLastUsed.set(groupId, r + 1)
    }

    // [STOP 5] — Vérification finale (ne devrait jamais déclencher si STOP 4 passe)
    if (roundItems.length < K) break

    const activeCriterion: SaveOneCriterion =
      config.criterion === 'random' ? pickRandomCriterion() : config.criterion

    rounds.push({
      roundNumber:    r + 1,
      items:          shuffle(roundItems) as IdolItem[] | SongItem[],
      activeCriterion,
    })
  }

  return rounds
}

export function getItemId(item: IdolItem | SongItem): string {
  return item.type === 'idol' ? item.idolId : item.songId
}
