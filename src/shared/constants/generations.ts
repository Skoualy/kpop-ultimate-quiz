import type { Generation } from '@/shared/models'

export const GENERATIONS: Generation[] = ['1', '2', '3', '4', '5']

export const GENERATION_LABELS: Record<Generation, string> = {
  '1': '1ère génération',
  '2': '2ème génération',
  '3': '3ème génération',
  '4': '4ème génération',
  '5': '5ème génération',
}

/** Retourne la génération suggérée selon l'année de début */
export function debutYearToGeneration(year: number): Generation {
  if (year <= 2002) return '1'
  if (year <= 2011) return '2'
  if (year <= 2017) return '3'
  if (year <= 2021) return '4'
  return '5'
}
