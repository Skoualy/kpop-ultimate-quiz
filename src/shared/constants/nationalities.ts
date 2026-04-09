import type { NationalityCode } from '@/shared/models'

export const NATIONALITIES: NationalityCode[] = ['kr', 'jp', 'cn', 'tw', 'th', 'us', 'au']

export const NATIONALITY_LABELS: Record<NationalityCode, string> = {
  kr: '🇰🇷 Coréenne',
  jp: '🇯🇵 Japonaise',
  cn: '🇨🇳 Chinoise',
  tw: '🇹🇼 Taïwanaise',
  th: '🇹🇭 Thaïlandaise',
  us: '🇺🇸 Américaine',
  au: '🇦🇺 Australienne',
}
