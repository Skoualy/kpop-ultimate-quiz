import type { MemberRole } from '@/shared/models'

export const ROLES: MemberRole[] = [
  'leader',
  'mainVocal',
  'vocal',
  'mainDancer',
  'dancer',
  'mainRapper',
  'rapper',
  'visual',
  'maknae',
]

export const ROLE_LABELS: Record<MemberRole, string> = {
  leader: 'Leader',
  mainVocal: 'Main Vocal',
  vocal: 'Vocal',
  mainDancer: 'Main Dancer',
  dancer: 'Dancer',
  mainRapper: 'Main Rapper',
  rapper: 'Rapper',
  visual: 'Visual',
  maknae: 'Maknae',
}


export const PERFORMANCE_ROLES: MemberRole[] = [
  'mainVocal',
  'vocal',
  'mainDancer',
  'dancer',
  'mainRapper',
  'rapper',
]
