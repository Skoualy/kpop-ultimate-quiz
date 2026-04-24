import { NATIONALITIES, NATIONALITY_LABELS } from '@/shared/constants'
import type { NationalityCode } from '@/shared/models'

interface Props {
  value: NationalityCode
  onChange: (v: NationalityCode) => void
  disabled?: boolean
}

export function SelectNationalityControl({ value, onChange, disabled }: Props) {
  return (
    <select
      className="select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as NationalityCode)}
    >
      {NATIONALITIES.map((n) => (
        <option key={n} value={n}>
          {NATIONALITY_LABELS[n]}
        </option>
      ))}
    </select>
  )
}
