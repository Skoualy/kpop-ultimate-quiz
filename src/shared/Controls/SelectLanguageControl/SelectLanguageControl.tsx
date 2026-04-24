import { LANGUAGE_LABELS, LANGUAGES } from '@/shared/constants/languages'
import type { LanguageCode } from '@/shared/models'

interface Props {
  value: LanguageCode | ''
  onChange: (v: LanguageCode | '') => void
  disabled?: boolean
}

export function SelectLanguageControl({ value, onChange, disabled }: Props) {
  return (
    <select
      className="select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as LanguageCode | '')}
    >
      {LANGUAGES.map((n) => (
        <option key={n} value={n}>
          {LANGUAGE_LABELS[n]}
        </option>
      ))}
    </select>
  )
}
