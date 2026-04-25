/**
 * Mise à jour du type ContributionBundle pour inclure les crédits images.
 *
 * Ajouter ces imports et le champ `credits` au fichier existant
 * src/shared/models/ContributionBundle.ts
 *
 * ─── PATCH à appliquer ───────────────────────────────────────────────────────
 *
 * 1. Ajouter l'import en haut du fichier :
 *    import type { ImageCreditInput } from './AssetCredit'
 *
 * 2. Ajouter le champ optionnel dans ContributionBundle :
 *    credits?: BundleCreditEntry[]
 *
 * 3. Ajouter l'interface BundleCreditEntry :
 */

import type { ImageCreditInput } from './AssetCredit'

/**
 * Entrée de crédit dans le bundle contributor.
 * Une entrée par image (cover de l'artiste + portrait de chaque idole).
 */
export interface BundleCreditEntry {
  entityType: 'idol' | 'group'
  /** groupId ou idolId selon entityType */
  entityId: string
  assetType: 'portrait' | 'cover'
  creditInput: ImageCreditInput
}

/*
 * Exemple de ContributionBundle mis à jour :
 *
 * export interface ContributionBundle {
 *   meta: ContributionBundleMeta
 *   group: Group
 *   idols: Idol[]
 *   labels?: Label[]
 *   credits?: BundleCreditEntry[]   // ← nouveau
 * }
 */
