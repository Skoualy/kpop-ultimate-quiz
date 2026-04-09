/**
 * Transforme un nom en identifiant kebab-case valide.
 * Gère les cas spéciaux : + → "plus", & → "and", @ → "at"
 */
const SPECIAL_CHARS: Record<string, string> = {
  '+': '-plus',
  '&': '-and',
  '@': '-at',
  '#': '-hash',
}

export function slugify(str: string): string {
  let s = str.trim()
  // Remplacer les caractères spéciaux avant normalisation
  for (const [char, replacement] of Object.entries(SPECIAL_CHARS)) {
    // Échappe le char pour l'utiliser dans une RegExp littérale
    s = s.split(char).join(replacement)
  }
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // accents
    .replace(/[^a-z0-9-]+/g, '-')    // tout sauf lettres, chiffres, tirets
    .replace(/-{2,}/g, '-')           // tirets multiples
    .replace(/^-+|-+$/g, '')          // tirets en début/fin
}

/** Génère un ID unique en évitant les collisions */
export function slugifyUnique(name: string, existingIds: string[]): string {
  const base = slugify(name)
  if (!existingIds.includes(base)) return base
  let i = 2
  while (existingIds.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}
