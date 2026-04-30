/**
 * Valeur sentinelle universelle pour l'option "tous / toutes / all".
 *
 * Utilisée comme valeur de config stockée (criterion, songType, songLanguage…).
 * Le BadgeGroupControl l'utilise en interne pour l'option injectée via allOptionLabel :
 *   - Quand l'utilisateur sélectionne "Tous" → onChange([]) est remontée au parent
 *   - value=[] dans BadgeGroupControl ↔ "Tous" visuellement sélectionné
 *
 * Ne JAMAIS hardcoder 'all' dans les composants — toujours importer cette constante.
 */
export const ALL_OPTION_VALUE = 'all' as const
export type  AllOptionValue   = typeof ALL_OPTION_VALUE
