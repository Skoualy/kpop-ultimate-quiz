import type { LanguageCode } from '@/shared/models'

export const LANGUAGES: LanguageCode[] = ['kr', 'jp', 'en']

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  kr: 'Coréen',
  jp: 'Japonais',
  en: 'Anglais',
}

/**
 * Options prêtes à l'emploi pour BadgeGroupControl.
 * N'inclut PAS l'option 'all' — à passer via allOptionLabel="Toutes".
 */
export const LANGUAGE_OPTIONS: { value: LanguageCode; label: string }[] = LANGUAGES.map(
  (code) => ({ value: code, label: LANGUAGE_LABELS[code] }),
)
