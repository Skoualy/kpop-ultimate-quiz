/**
 * timestampHelper.ts
 *
 * Gestion des timestamps de démarrage des extraits YouTube.
 *
 * Distinction fondamentale :
 *   baseTimestamp  — valeur canonique parmi [60, 90, 120] ; SEULE valeur stockée en session
 *   playbackStart  — valeur technique de démarrage pour le player (= baseTimestamp dans l'implémentation actuelle)
 *
 * Aucune valeur dérivée (61, 84, 108…) ne doit jamais être stockée en session.
 */

// ─── Timestamps canoniques ────────────────────────────────────────────────────

export const CANONICAL_TIMESTAMPS = [60, 90, 120] as const
export type CanonicalTimestamp = (typeof CANONICAL_TIMESTAMPS)[number]

/** Durée par défaut quand la vraie durée vidéo est inconnue */
export const DEFAULT_DURATION_SECONDS = 180

/**
 * Choisit un timestamp canonique parmi [60, 90, 120].
 * Évite `lastTimestamp` si d'autres candidats sont disponibles.
 *
 * Compatible avec un futur champ `clipStarts[]` dans le dataset :
 * si fourni, il remplace les candidats par défaut.
 *
 * @param lastTimestamp  Dernier baseTimestamp stocké pour cette chanson (optionnel)
 * @param clipStarts     Override depuis le dataset — doit contenir uniquement des canoniques
 */
export function pickCanonicalTimestamp(
  lastTimestamp?: number,
  clipStarts?: number[],
): number {
  // Utiliser les candidats du dataset si disponibles
  const candidates: number[] = (clipStarts && clipStarts.length > 0)
    ? clipStarts
    : [...CANONICAL_TIMESTAMPS]

  if (candidates.length === 0) return CANONICAL_TIMESTAMPS[0]
  if (candidates.length === 1) return candidates[0]

  // Exclure le dernier timestamp si possible
  if (lastTimestamp !== undefined) {
    const alternatives = candidates.filter((t) => t !== lastTimestamp)
    if (alternatives.length > 0) {
      return alternatives[Math.floor(Math.random() * alternatives.length)]
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)]
}

/**
 * Rétrocompatibilité — retourne toujours un timestamp canonique.
 * Ne plus utiliser pour les nouveaux appels : préférer pickCanonicalTimestamp().
 */
export function computeStartTime(_duration?: number, _clipDuration?: number): number {
  return pickCanonicalTimestamp()
}
