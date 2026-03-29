// ─── mappings.ts ──────────────────────────────────────────────────────────────
// Source de vérité unique pour tous les labels UI, options de sélect et constantes
// partagées entre les composants contributor, config et gameplay.
//
// Convention de nommage (spec §1) :
//   UPPER_SNAKE_CASE  → constantes globales partagées
//   camelCase         → fonctions utilitaires locales
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MemberRole,
  NationalityCode,
  GroupCategory,
  GroupStatus,
  MemberStatus,
  Generation,
  LanguageCode,
  SaveOneCriterion,
} from '../types';

// ─── Rôles ────────────────────────────────────────────────────────────────────

export const ALL_ROLES: readonly MemberRole[] = [
  'leader',
  'mainVocal',
  'vocal',
  'mainDancer',
  'dancer',
  'mainRapper',
  'rapper',
  'visual',
  'maknae',
] as const;

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
};

// Rôles orientés performance — utilisés par le moteur de jeu (critère "performance")
export const PERFORMANCE_ROLES: readonly MemberRole[] = [
  'mainVocal',
  'vocal',
  'mainDancer',
  'dancer',
  'mainRapper',
  'rapper',
] as const;

// ─── Nationalités ─────────────────────────────────────────────────────────────

export const NATIONALITY_OPTIONS: readonly { code: NationalityCode; label: string }[] = [
  { code: 'kr', label: '🇰🇷 Corée du Sud' },
  { code: 'jp', label: '🇯🇵 Japon' },
  { code: 'cn', label: '🇨🇳 Chine' },
  { code: 'tw', label: '🇹🇼 Taïwan' },
  { code: 'th', label: '🇹🇭 Thaïlande' },
  { code: 'us', label: '🇺🇸 USA' },
  { code: 'au', label: '🇦🇺 Australie' },
] as const;

export const NATIONALITY_LABELS: Record<NationalityCode, string> = Object.fromEntries(
  NATIONALITY_OPTIONS.map(({ code, label }) => [code, label])
) as Record<NationalityCode, string>;

// ─── Catégories de groupe ─────────────────────────────────────────────────────

export const CATEGORY_OPTIONS: readonly { value: GroupCategory; label: string }[] = [
  { value: 'girlGroup', label: 'Girls group' },
  { value: 'boyGroup', label: 'Boys group' },
  { value: 'femaleSoloist', label: 'Soloist (F)' },
  { value: 'maleSoloist', label: 'Soloist (M)' },
] as const;

export const CATEGORY_LABELS: Record<GroupCategory, string> = {
  girlGroup: 'Girls group',
  boyGroup: 'Boys group',
  femaleSoloist: 'Soloist (F)',
  maleSoloist: 'Soloist (M)',
};

// ─── Statut de groupe ─────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<GroupStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
};

// ─── Statut de membre ─────────────────────────────────────────────────────────

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  current: 'Membre actuel',
  former: 'Ancien membre',
};

// ─── Générations ──────────────────────────────────────────────────────────────

export const GENERATION_OPTIONS: readonly { value: Generation; label: string }[] = [
  { value: '1', label: '1ère génération' },
  { value: '2', label: '2ème génération' },
  { value: '3', label: '3ème génération' },
  { value: '4', label: '4ème génération' },
  { value: '5', label: '5ème génération' },
] as const;

export const GENERATION_LABELS: Record<Generation, string> = {
  '1': 'Gen 1',
  '2': 'Gen 2',
  '3': 'Gen 3',
  '4': 'Gen 4',
  '5': 'Gen 5',
};

/**
 * Déduit la génération à partir de l'année de début.
 * Résultat auto-suggéré, toujours modifiable manuellement (spec §7 `generation`).
 */
export function guessGeneration(year: number): Generation {
  if (year < 2000) return '1';
  if (year < 2012) return '2';
  if (year < 2018) return '3';
  if (year < 2023) return '4';
  return '5';
}

// ─── Langues ──────────────────────────────────────────────────────────────────
// Le coréen est implicite en v1 — absent du champ `language` (spec §5)

export const LANGUAGE_OPTIONS: readonly { value: LanguageCode | ''; label: string }[] = [
  { value: '', label: '🇰🇷 Coréen (défaut)' },
  { value: 'jp', label: '🇯🇵 Japonais' },
  { value: 'en', label: '🇺🇸 Anglais' },
] as const;

export const LANGUAGE_LABELS: Record<LanguageCode | '', string> = {
  '': '🇰🇷 Coréen',
  jp: '🇯🇵 Japonais',
  en: '🇺🇸 Anglais',
};

// ─── Critères Save One ────────────────────────────────────────────────────────
// `beauty` est le critère gameplay — NE PAS confondre avec le rôle dataset `visual`

export const CRITERION_OPTIONS: readonly { value: SaveOneCriterion; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'beauty', label: 'Beauté' },
  { value: 'personality', label: 'Personnalité' },
  { value: 'voice', label: 'Voix' },
  { value: 'performance', label: 'Performance' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'random', label: 'Aléatoire' },
] as const;

export const CRITERION_LABELS: Record<SaveOneCriterion, string> = Object.fromEntries(
  CRITERION_OPTIONS.map(({ value, label }) => [value, label])
) as Record<SaveOneCriterion, string>;

// ─── Genre déduit depuis la catégorie ────────────────────────────────────────
// `gender` n'est jamais saisi manuellement — calculé depuis `group.category` (spec §3)

export function getCategoryGenderCode(category: GroupCategory): 'f' | 'm' {
  return category === 'girlGroup' || category === 'femaleSoloist' ? 'f' : 'm';
}

export function isSoloistCategory(category: GroupCategory): boolean {
  return category === 'femaleSoloist' || category === 'maleSoloist';
}
