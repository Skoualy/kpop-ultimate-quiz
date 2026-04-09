import { NATIONALITIES } from '@/shared/constants'
import type { NationalityCode } from '@/shared/models'

// Flags uniquement en prefix (UI only — pas de code texte)
const FLAG: Record<NationalityCode, string> = {
  kr: '🇰🇷', jp: '🇯🇵', cn: '🇨🇳', tw: '🇹🇼', th: '🇹🇭', us: '🇺🇸', au: '🇦🇺',
}
const LABEL: Record<NationalityCode, string> = {
  kr: 'Coréenne', jp: 'Japonaise', cn: 'Chinoise',
  tw: 'Taïwanaise', th: 'Thaïlandaise', us: 'Américaine', au: 'Australienne',
}

interface Props { value: NationalityCode; onChange: (v: NationalityCode) => void; disabled?: boolean }

export function SelectNationalityControl({ value, onChange, disabled }: Props) {
  return (
    <select className="select" value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value as NationalityCode)}>
      {NATIONALITIES.map((n) => (
        <option key={n} value={n}>{FLAG[n]} {LABEL[n]}</option>
      ))}
    </select>
  )
}
