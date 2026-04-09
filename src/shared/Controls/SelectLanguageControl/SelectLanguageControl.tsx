import type { LanguageCode } from '@/shared/models'

const LANGUAGE_OPTIONS: { value: LanguageCode | ''; label: string }[] = [
  { value: '',   label: '🇰🇷 Coréen (défaut)' },
  { value: 'jp', label: '🇯🇵 Japonais' },
  { value: 'en', label: '🇺🇸 Anglais' },
]

interface Props { value: LanguageCode | ''; onChange: (v: LanguageCode | '') => void; disabled?: boolean }

export function SelectLanguageControl({ value, onChange, disabled }: Props) {
  return (
    <select className="select" value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value as LanguageCode | '')}>
      {LANGUAGE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
